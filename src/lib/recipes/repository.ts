/**
 * Recipe repository - MongoDB-primary data access layer.
 *
 * Provides CRUD operations for recipes stored in MongoDB.
 * This is the source of truth for recipe data in production.
 *
 * Usage:
 *   import { createRecipe, getRecipeBySlug } from '@/lib/recipes/repository';
 *
 *   const result = await createRecipe(content, 'entrees', 'mcp');
 *   const recipe = await getRecipeBySlug('beef-stroganoff');
 */

import { connectDB } from '@/db/connection';
import { Recipe } from '@/db/models/recipe.model';
import type { IRecipe, IRecipeDocument, RecipeSource } from '@/db/types';
import { parseCooklang } from '@/lib/cooklang/parser';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

const COLLECTION_NAME = 'recipes';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RecipeWriteSuccess {
  success: true;
  slug: string;
  recipe: IRecipeDocument;
}

export interface RecipeWriteError {
  success: false;
  error: string;
  code?: 'PARSE_ERROR' | 'DUPLICATE_SLUG' | 'NOT_FOUND' | 'VALIDATION_ERROR';
}

export type RecipeWriteResult = RecipeWriteSuccess | RecipeWriteError;

export interface RecipeDeleteSuccess {
  success: true;
}

export interface RecipeDeleteError {
  success: false;
  error: string;
  code?: 'NOT_FOUND';
}

export type RecipeDeleteResult = RecipeDeleteSuccess | RecipeDeleteError;

/**
 * Recipe detail format for UI display
 */
export interface RecipeDetail {
  slug: string;
  title: string;
  category: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  difficulty?: string;
  cuisine?: string;
  course?: string;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
  cookware: Array<{
    name: string;
    quantity?: number;
  }>;
  steps: Array<{
    text: string;
    timers?: Array<{ duration: number; unit: string }>;
    ingredients?: Array<{ name: string; quantity?: string; unit?: string }>;
  }>;
  tags: string[];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Build file path from category and slug
 */
function buildFilePath(category: string, slug: string): string {
  return `${category}/${slug}.cook`;
}

/**
 * Extract category from file path
 */
function extractCategory(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length > 1 && parts[0] ? parts[0] : 'uncategorized';
}

/**
 * Map ingredient to detail format, omitting undefined properties
 */
function mapIngredient(i: IRecipe['ingredients'][number]): RecipeDetail['ingredients'][number] {
  const result: RecipeDetail['ingredients'][number] = { name: i.name };
  if (i.quantity !== undefined) {
    result.quantity = i.quantity;
  }
  if (i.unit !== undefined) {
    result.unit = i.unit;
  }
  return result;
}

/**
 * Map cookware to detail format, omitting undefined properties
 */
function mapCookware(c: IRecipe['cookware'][number]): RecipeDetail['cookware'][number] {
  const result: RecipeDetail['cookware'][number] = { name: c.name };
  if (c.quantity !== undefined) {
    result.quantity = c.quantity;
  }
  return result;
}

/**
 * Map timer to plain object (strips Mongoose subdocument metadata)
 */
function mapTimer(
  t: IRecipe['steps'][number]['timers'] extends Array<infer T> | undefined ? T : never,
): { duration: number; unit: string } {
  return { duration: t.duration, unit: t.unit };
}

/**
 * Map step to detail format, omitting undefined properties
 */
function mapStep(s: IRecipe['steps'][number]): RecipeDetail['steps'][number] {
  const result: RecipeDetail['steps'][number] = { text: s.text };
  if (s.timers && s.timers.length > 0) {
    result.timers = s.timers.map(mapTimer);
  }
  if (s.ingredients && s.ingredients.length > 0) {
    result.ingredients = s.ingredients.map(mapIngredient);
  }
  return result;
}

/**
 * Convert IRecipeDocument to RecipeDetail format for UI display
 */
function toRecipeDetail(doc: IRecipeDocument): RecipeDetail {
  const detail: RecipeDetail = {
    slug: doc.slug,
    title: doc.title,
    category: doc.category ?? extractCategory(doc.filePath),
    ingredients: doc.ingredients.map(mapIngredient),
    cookware: doc.cookware.map(mapCookware),
    steps: doc.steps.map(mapStep),
    tags: [...(doc.tags ?? [])],
  };

  // Add optional fields if present
  if (doc.description) {
    detail.description = doc.description;
  }
  if (doc.servings !== undefined) {
    detail.servings = doc.servings;
  }
  if (doc.prepTime !== undefined) {
    detail.prepTime = doc.prepTime;
  }
  if (doc.cookTime !== undefined) {
    detail.cookTime = doc.cookTime;
  }
  if (doc.totalTime !== undefined) {
    detail.totalTime = doc.totalTime;
  }
  if (doc.difficulty) {
    detail.difficulty = doc.difficulty;
  }
  if (doc.cuisine) {
    detail.cuisine = doc.cuisine;
  }
  if (doc.course) {
    detail.course = doc.course;
  }

  return detail;
}

// -----------------------------------------------------------------------------
// Read Operations
// -----------------------------------------------------------------------------

/**
 * Get a recipe by slug from MongoDB
 */
export async function getRecipeBySlug(slug: string): Promise<IRecipeDocument | null> {
  return withTrace('repository.getRecipeBySlug', async (span) => {
    span.setAttribute('slug', slug);

    await connectDB();

    const recipe = await traceDbQuery('findOne', COLLECTION_NAME, async () => {
      return Recipe.findOne({ slug }).exec();
    });

    if (recipe) {
      logger.recipes.debug('Recipe found', { slug });
    } else {
      logger.recipes.debug('Recipe not found', { slug });
    }

    return recipe;
  });
}

/**
 * Get recipe detail by slug for UI display
 *
 * Returns the recipe in RecipeDetail format suitable for the detail page.
 */
export async function getRecipeDetail(slug: string): Promise<RecipeDetail | null> {
  const doc = await getRecipeBySlug(slug);
  if (!doc) {
    return null;
  }
  return toRecipeDetail(doc);
}

/**
 * Get all recipes from MongoDB
 */
export async function getAllRecipes(): Promise<IRecipeDocument[]> {
  return withTrace('repository.getAllRecipes', async (span) => {
    await connectDB();

    const recipes = await traceDbQuery('find', COLLECTION_NAME, async () => {
      return Recipe.find().sort({ title: 1 }).exec();
    });

    span.setAttribute('count', recipes.length);
    logger.recipes.debug('Loaded all recipes', { count: recipes.length });

    return recipes;
  });
}

/**
 * Get recipes by category from MongoDB
 */
export async function getRecipesByCategory(category: string): Promise<IRecipeDocument[]> {
  return withTrace('repository.getRecipesByCategory', async (span) => {
    span.setAttribute('category', category);

    await connectDB();

    const recipes = await traceDbQuery('find', COLLECTION_NAME, async () => {
      return Recipe.find({ category }).sort({ title: 1 }).exec();
    });

    span.setAttribute('count', recipes.length);
    return recipes;
  });
}

/**
 * Get raw Cooklang content for a recipe
 */
export async function getRawCooklangContent(
  slug: string,
): Promise<{ content: string; category: string; slug: string } | null> {
  return withTrace('repository.getRawCooklangContent', async (span) => {
    span.setAttribute('slug', slug);

    const recipe = await getRecipeBySlug(slug);

    if (!recipe) {
      return null;
    }

    // If rawCooklang is stored, use it; otherwise return empty
    // (legacy recipes may not have this field)
    const content = recipe.rawCooklang ?? '';
    const category = recipe.category ?? extractCategory(recipe.filePath);

    return { content, category, slug };
  });
}

// -----------------------------------------------------------------------------
// Write Operations
// -----------------------------------------------------------------------------

/**
 * Create a new recipe in MongoDB
 */
export async function createRecipe(
  content: string,
  category: string,
  source: RecipeSource,
): Promise<RecipeWriteResult> {
  return withTrace('repository.createRecipe', async (span) => {
    span.setAttribute('category', category);
    span.setAttribute('source', source);

    await connectDB();

    // Parse the Cooklang content
    const filePath = buildFilePath(category, 'new-recipe');
    const parseResult = await parseCooklang(content, {
      filePath,
      gitCommitHash: source,
    });

    if (!parseResult.success) {
      logger.recipes.warn('Recipe parse failed', { error: parseResult.error });
      return {
        success: false,
        error: `Invalid Cooklang content: ${parseResult.error}`,
        code: 'PARSE_ERROR',
      };
    }

    const { recipe: parsedRecipe } = parseResult;
    const { slug } = parsedRecipe;
    span.setAttribute('slug', slug);

    // Check for duplicate slug
    const existing = await traceDbQuery('findOne', COLLECTION_NAME, async () => {
      return Recipe.findOne({ slug }).exec();
    });

    if (existing) {
      logger.recipes.warn('Duplicate slug', { slug });
      return {
        success: false,
        error: `Recipe with slug "${slug}" already exists`,
        code: 'DUPLICATE_SLUG',
      };
    }

    // Build the recipe document
    const recipeData: Partial<IRecipe> = {
      ...parsedRecipe,
      filePath: buildFilePath(category, slug),
      rawCooklang: content,
      category,
      source,
    };

    // Save to MongoDB
    const savedRecipe = await traceDbQuery('create', COLLECTION_NAME, async () => {
      return Recipe.create(recipeData);
    });

    logger.recipes.info('Recipe created', { slug, category, source });

    return {
      success: true,
      slug,
      recipe: savedRecipe,
    };
  });
}

/**
 * Update an existing recipe in MongoDB
 */
export async function updateRecipe(
  slug: string,
  content: string,
  category: string,
): Promise<RecipeWriteResult> {
  return withTrace('repository.updateRecipe', async (span) => {
    span.setAttribute('slug', slug);
    span.setAttribute('category', category);

    await connectDB();

    // Find the existing recipe
    const existing = await traceDbQuery('findOne', COLLECTION_NAME, async () => {
      return Recipe.findOne({ slug }).exec();
    });

    if (!existing) {
      logger.recipes.warn('Recipe not found for update', { slug });
      return {
        success: false,
        error: `Recipe with slug "${slug}" not found`,
        code: 'NOT_FOUND',
      };
    }

    // Parse the new content
    const filePath = buildFilePath(category, slug);
    const parseResult = await parseCooklang(content, {
      filePath,
      gitCommitHash: 'update',
    });

    if (!parseResult.success) {
      logger.recipes.warn('Recipe parse failed', { error: parseResult.error });
      return {
        success: false,
        error: `Invalid Cooklang content: ${parseResult.error}`,
        code: 'PARSE_ERROR',
      };
    }

    const { recipe: parsedRecipe } = parseResult;
    const newSlug = parsedRecipe.slug;
    span.setAttribute('new_slug', newSlug);

    // Check for slug collision if slug changed
    if (newSlug !== slug) {
      const collision = await traceDbQuery('findOne', COLLECTION_NAME, async () => {
        return Recipe.findOne({ slug: newSlug }).exec();
      });

      if (collision) {
        logger.recipes.warn('Slug collision on update', { slug, newSlug });
        return {
          success: false,
          error: `Recipe with slug "${newSlug}" already exists`,
          code: 'DUPLICATE_SLUG',
        };
      }
    }

    // Update the recipe
    const updateData: Partial<IRecipe> = {
      ...parsedRecipe,
      slug: newSlug,
      filePath: buildFilePath(category, newSlug),
      rawCooklang: content,
      category,
      updatedAt: new Date(),
    };

    const updatedRecipe = await traceDbQuery('findOneAndUpdate', COLLECTION_NAME, async () => {
      return Recipe.findOneAndUpdate({ slug }, { $set: updateData }, { new: true }).exec();
    });

    if (!updatedRecipe) {
      return {
        success: false,
        error: 'Failed to update recipe',
        code: 'NOT_FOUND',
      };
    }

    logger.recipes.info('Recipe updated', {
      oldSlug: slug,
      newSlug,
      category,
    });

    return {
      success: true,
      slug: newSlug,
      recipe: updatedRecipe,
    };
  });
}

/**
 * Delete a recipe from MongoDB
 */
export async function deleteRecipe(slug: string): Promise<RecipeDeleteResult> {
  return withTrace('repository.deleteRecipe', async (span) => {
    span.setAttribute('slug', slug);

    await connectDB();

    const result = await traceDbQuery('deleteOne', COLLECTION_NAME, async () => {
      return Recipe.deleteOne({ slug }).exec();
    });

    if (result.deletedCount === 0) {
      logger.recipes.warn('Recipe not found for deletion', { slug });
      return {
        success: false,
        error: `Recipe with slug "${slug}" not found`,
        code: 'NOT_FOUND',
      };
    }

    logger.recipes.info('Recipe deleted', { slug });

    return { success: true };
  });
}

// -----------------------------------------------------------------------------
// Utility Operations
// -----------------------------------------------------------------------------

/**
 * Check if a recipe exists by slug
 */
export async function recipeExists(slug: string): Promise<boolean> {
  await connectDB();

  const count = await traceDbQuery('countDocuments', COLLECTION_NAME, async () => {
    return Recipe.countDocuments({ slug }).exec();
  });

  return count > 0;
}

/**
 * Get list of available categories from existing recipes
 */
export async function getCategories(): Promise<string[]> {
  await connectDB();

  const categories = await traceDbQuery('distinct', COLLECTION_NAME, async () => {
    return Recipe.distinct('category').exec();
  });

  // Filter out undefined/null and sort
  return categories.filter((c): c is string => typeof c === 'string' && c.length > 0).sort();
}

/**
 * Backfill rawCooklang for recipes that don't have it
 * (used for migration from filesystem-primary to MongoDB-primary)
 */
export async function backfillRawCooklang(
  slug: string,
  content: string,
  category: string,
): Promise<boolean> {
  return withTrace('repository.backfillRawCooklang', async (span) => {
    span.setAttribute('slug', slug);

    await connectDB();

    const result = await traceDbQuery('updateOne', COLLECTION_NAME, async () => {
      return Recipe.updateOne(
        { slug, rawCooklang: { $exists: false } },
        { $set: { rawCooklang: content, category, source: 'sync' } },
      ).exec();
    });

    const updated = result.modifiedCount > 0;
    if (updated) {
      logger.recipes.info('Backfilled rawCooklang', { slug });
    }

    return updated;
  });
}
