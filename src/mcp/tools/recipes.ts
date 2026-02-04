/**
 * MCP recipe tools.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { connectDB } from '@/db/connection';
import { findRecipesByIngredient, searchRecipes } from '@/db/models/recipe.model';
import type { IRecipeDocument } from '@/db/types';
import { logger } from '@/lib/logger';
import {
  getAllRecipes,
  getCategories,
  getRecipeBySlug,
  type RecipePreview,
} from '@/lib/recipes/loader';
import { createRecipe, deleteRecipe, updateRecipe } from '@/lib/recipes/repository';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import { buildToolResult } from '@/mcp/tools/utils';

const RECIPE_COLLECTION = 'recipes';
const RECIPE_LIST_LIMIT_DEFAULT = 50;
const RECIPE_LIST_LIMIT_MAX = 200;
const RECIPE_SEARCH_LIMIT_DEFAULT = 20;
const RECIPE_SEARCH_LIMIT_MAX = 50;

const recipePreviewSchema = z.object({
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  totalTime: z.number().optional(),
  description: z.string().optional(),
  ingredientCount: z.number(),
});

const recipeDetailSchema = z.object({
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string().optional(),
  servings: z.number().optional(),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  totalTime: z.number().optional(),
  difficulty: z.string().optional(),
  cuisine: z.string().optional(),
  course: z.string().optional(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string().optional(),
      unit: z.string().optional(),
    }),
  ),
  cookware: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().optional(),
    }),
  ),
  steps: z.array(
    z.object({
      text: z.string(),
      timers: z
        .array(
          z.object({
            duration: z.number(),
            unit: z.string(),
          }),
        )
        .optional(),
    }),
  ),
  tags: z.array(z.string()),
});

const recipeSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  cuisine: z.string().optional(),
  course: z.string().optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
});

type RecipeSummary = z.infer<typeof recipeSummarySchema>;

function clampListLimit(limit?: number): number {
  if (!limit || limit <= 0) {
    return RECIPE_LIST_LIMIT_DEFAULT;
  }
  return Math.min(limit, RECIPE_LIST_LIMIT_MAX);
}

function clampSearchLimit(limit?: number): number {
  if (!limit || limit <= 0) {
    return RECIPE_SEARCH_LIMIT_DEFAULT;
  }
  return Math.min(limit, RECIPE_SEARCH_LIMIT_MAX);
}

function deriveCategory(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }
  const [category] = filePath.split('/');
  return category || undefined;
}

function toRecipeSummary(doc: IRecipeDocument): RecipeSummary {
  return {
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    cuisine: doc.cuisine,
    course: doc.course,
    tags: doc.tags ?? [],
    category: deriveCategory(doc.filePath),
  };
}

function filterRecipePreviews(previews: RecipePreview[], category?: string): RecipePreview[] {
  if (!category) {
    return previews;
  }
  return previews.filter((preview) => preview.category === category);
}

interface CategoryValidationError {
  success: false;
  error: string;
}

function validateCategory(category: string): CategoryValidationError | null {
  const validCategories = getCategories();
  if (!validCategories.includes(category)) {
    return {
      success: false,
      error: `Invalid category. Valid categories: ${validCategories.join(', ')}`,
    };
  }
  return null;
}

export function registerRecipeTools(server: McpServer): void {
  server.registerTool(
    'recipe_list',
    {
      title: 'List recipes',
      description: 'List available recipes with optional category filtering.',
      inputSchema: {
        category: z.string().optional().describe('Optional recipe category filter'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(RECIPE_LIST_LIMIT_MAX)
          .optional()
          .describe('Maximum number of recipes to return'),
      },
      outputSchema: {
        recipes: z.array(recipePreviewSchema),
        total: z.number(),
      },
    },
    async ({ category, limit }) => {
      return withTrace('mcp.tool.recipe_list', async (span) => {
        span.setAttribute('category', category ?? 'all');
        const listLimit = clampListLimit(limit);
        span.setAttribute('limit', listLimit);

        const recipes = await getAllRecipes();
        const filtered = filterRecipePreviews(recipes, category);
        const response = {
          recipes: filtered.slice(0, listLimit),
          total: filtered.length,
        };

        logger.mcp.info('MCP recipe_list executed', {
          total: response.total,
          returned: response.recipes.length,
        });

        return buildToolResult(response);
      });
    },
  );

  server.registerTool(
    'recipe_get',
    {
      title: 'Get recipe',
      description: 'Fetch a full recipe by slug.',
      inputSchema: {
        slug: z.string().describe('Recipe slug'),
      },
      outputSchema: {
        found: z.boolean(),
        recipe: recipeDetailSchema.optional(),
      },
    },
    async ({ slug }) => {
      return withTrace('mcp.tool.recipe_get', async (span) => {
        span.setAttribute('slug', slug);
        const recipe = await getRecipeBySlug(slug);
        const response = {
          found: recipe !== null,
          recipe: recipe ?? undefined,
        };

        logger.mcp.info('MCP recipe_get executed', { slug, found: response.found });
        return buildToolResult(response);
      });
    },
  );

  server.registerTool(
    'recipe_search',
    {
      title: 'Search recipes',
      description: 'Search recipe metadata stored in MongoDB.',
      inputSchema: {
        query: z.string().describe('Search query'),
        cuisine: z.string().optional().describe('Optional cuisine filter'),
        course: z.string().optional().describe('Optional course filter'),
        tags: z.array(z.string()).optional().describe('Optional tag filter (all tags match)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(RECIPE_SEARCH_LIMIT_MAX)
          .optional()
          .describe('Maximum number of results'),
        skip: z.number().int().min(0).optional().describe('Offset for pagination'),
      },
      outputSchema: {
        recipes: z.array(recipeSummarySchema),
        total: z.number(),
      },
    },
    async ({ query, cuisine, course, tags, limit, skip }) => {
      return withTrace('mcp.tool.recipe_search', async (span) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
          throw new Error('Query must not be empty');
        }

        span.setAttribute('query_length', trimmedQuery.length);
        span.setAttribute('limit', limit ?? RECIPE_SEARCH_LIMIT_DEFAULT);
        span.setAttribute('skip', skip ?? 0);

        await connectDB();

        const results = await traceDbQuery('search', RECIPE_COLLECTION, async () => {
          const searchOptions: {
            limit: number;
            skip: number;
            cuisine?: string;
            course?: string;
            tags?: string[];
          } = {
            limit: clampSearchLimit(limit),
            skip: skip ?? 0,
          };

          if (cuisine) {
            searchOptions.cuisine = cuisine;
          }
          if (course) {
            searchOptions.course = course;
          }
          if (tags && tags.length > 0) {
            searchOptions.tags = tags;
          }

          return searchRecipes(trimmedQuery, searchOptions);
        });

        const response = {
          recipes: results.map(toRecipeSummary),
          total: results.length,
        };

        logger.mcp.info('MCP recipe_search executed', {
          total: response.total,
        });

        return buildToolResult(response);
      });
    },
  );

  server.registerTool(
    'ingredient_lookup',
    {
      title: 'Find recipes by ingredient',
      description: 'Find recipes that include a specific ingredient.',
      inputSchema: {
        ingredient: z.string().describe('Ingredient name to match'),
      },
      outputSchema: {
        recipes: z.array(recipeSummarySchema),
        total: z.number(),
      },
    },
    async ({ ingredient }) => {
      return withTrace('mcp.tool.ingredient_lookup', async (span) => {
        const trimmedIngredient = ingredient.trim();
        if (!trimmedIngredient) {
          throw new Error('Ingredient must not be empty');
        }

        span.setAttribute('ingredient', trimmedIngredient);
        await connectDB();

        const results = await traceDbQuery('find', RECIPE_COLLECTION, async () => {
          return findRecipesByIngredient(trimmedIngredient);
        });

        const response = {
          recipes: results.map(toRecipeSummary),
          total: results.length,
        };

        logger.mcp.info('MCP ingredient_lookup executed', {
          total: response.total,
        });

        return buildToolResult(response);
      });
    },
  );

  server.registerTool(
    'recipe_categories',
    {
      title: 'List recipe categories',
      description: 'Get the list of valid recipe categories.',
      inputSchema: {},
      outputSchema: {
        categories: z.array(z.string()),
      },
    },
    async () => {
      return withTrace('mcp.tool.recipe_categories', async (span) => {
        const categories = getCategories();
        span.setAttribute('category_count', categories.length);

        logger.mcp.info('MCP recipe_categories executed', {
          count: categories.length,
        });

        return buildToolResult({ categories });
      });
    },
  );

  server.registerTool(
    'recipe_create',
    {
      title: 'Create recipe',
      description: 'Create a new recipe from Cooklang content.',
      inputSchema: {
        content: z.string().describe('Raw Cooklang content'),
        category: z.string().describe('Recipe category (e.g., "entrees", "desserts")'),
      },
      outputSchema: {
        success: z.boolean(),
        slug: z.string().optional(),
        error: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ content, category }) => {
      return withTrace('mcp.tool.recipe_create', async (span) => {
        span.setAttribute('category', category);

        const categoryError = validateCategory(category);
        if (categoryError) {
          logger.mcp.warn('MCP recipe_create invalid category', { category });
          return buildToolResult(categoryError);
        }

        // Use repository to create recipe in MongoDB
        const result = await createRecipe(content, category, 'mcp');

        if (!result.success) {
          logger.mcp.warn('MCP recipe_create failed', { error: result.error });
          return buildToolResult({ success: false, error: result.error });
        }

        span.setAttribute('slug', result.slug);
        logger.mcp.info('MCP recipe_create executed', { slug: result.slug, category });

        return buildToolResult({ success: true, slug: result.slug });
      });
    },
  );

  server.registerTool(
    'recipe_update',
    {
      title: 'Update recipe',
      description: 'Update an existing recipe with new Cooklang content.',
      inputSchema: {
        slug: z.string().describe('Current recipe slug'),
        content: z.string().describe('New Cooklang content'),
        category: z.string().describe('Target category'),
      },
      outputSchema: {
        success: z.boolean(),
        slug: z.string().optional(),
        error: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ slug, content, category }) => {
      return withTrace('mcp.tool.recipe_update', async (span) => {
        span.setAttribute('slug', slug);
        span.setAttribute('category', category);

        const categoryError = validateCategory(category);
        if (categoryError) {
          logger.mcp.warn('MCP recipe_update invalid category', { category });
          return buildToolResult(categoryError);
        }

        // Use repository to update recipe in MongoDB
        const result = await updateRecipe(slug, content, category);

        if (!result.success) {
          logger.mcp.warn('MCP recipe_update failed', { error: result.error });
          return buildToolResult({ success: false, error: result.error });
        }

        span.setAttribute('new_slug', result.slug);
        logger.mcp.info('MCP recipe_update executed', {
          oldSlug: slug,
          newSlug: result.slug,
          category,
        });

        return buildToolResult({ success: true, slug: result.slug });
      });
    },
  );

  server.registerTool(
    'recipe_delete',
    {
      title: 'Delete recipe',
      description: 'Delete a recipe by slug.',
      inputSchema: {
        slug: z.string().describe('Recipe slug to delete'),
      },
      outputSchema: {
        success: z.boolean(),
        error: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    async ({ slug }) => {
      return withTrace('mcp.tool.recipe_delete', async (span) => {
        span.setAttribute('slug', slug);

        // Use repository to delete recipe from MongoDB
        const result = await deleteRecipe(slug);

        if (!result.success) {
          logger.mcp.warn('MCP recipe_delete failed', { error: result.error });
          return buildToolResult({ success: false, error: result.error });
        }

        logger.mcp.info('MCP recipe_delete executed', { slug });

        return buildToolResult({ success: true });
      });
    },
  );
}
