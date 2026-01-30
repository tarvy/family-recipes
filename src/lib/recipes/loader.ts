/**
 * Recipe loader for UI display.
 *
 * Reads .cook files from filesystem and returns preview data.
 *
 * Usage:
 *   import { getAllRecipes, getCategories } from '@/lib/recipes/loader';
 *
 *   const recipes = await getAllRecipes();
 *   const categories = getCategories();
 */

import { promises as fs } from 'node:fs';
import type { IRecipe } from '@/db/types';
import { parseCooklang } from '@/lib/cooklang/parser';
import { type CookFile, scanCooklangFiles } from '@/lib/git-recipes/file-scanner';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

/** Maximum description length for preview cards */
const MAX_DESCRIPTION_LENGTH = 150;

/** Default recipes directory relative to project root */
const RECIPES_DIRECTORY = 'recipes';

/**
 * Lightweight recipe data for card display
 */
export interface RecipePreview {
  /** URL-safe identifier */
  slug: string;
  /** Recipe name */
  title: string;
  /** Directory name: "entrees", "desserts", etc. */
  category: string;
  /** Prep time in minutes */
  prepTime?: number;
  /** Cook time in minutes */
  cookTime?: number;
  /** Total time in minutes (computed if not explicit) */
  totalTime?: number;
  /** First 150 chars of description if available */
  description?: string;
  /** Number of ingredients for "12 ingredients" display */
  ingredientCount: number;
}

/**
 * Extract category from relative file path
 *
 * @param relativePath - Path like "entrees/beef-stroganoff.cook"
 * @returns Category name or "uncategorized"
 */
function extractCategory(relativePath: string): string {
  const parts = relativePath.split('/');
  if (parts.length > 1) {
    const category = parts[0];
    if (category) {
      return category;
    }
  }
  return 'uncategorized';
}

/**
 * Compute total time from prep and cook times if not explicitly set
 */
function computeTotalTime(
  totalTime?: number,
  prepTime?: number,
  cookTime?: number,
): number | undefined {
  if (totalTime !== undefined) {
    return totalTime;
  }
  const sum = (prepTime ?? 0) + (cookTime ?? 0);
  return sum > 0 ? sum : undefined;
}

/**
 * Truncate description for preview display
 */
function truncateDescription(description?: string): string | undefined {
  if (!description) {
    return undefined;
  }
  return description.length > MAX_DESCRIPTION_LENGTH
    ? description.slice(0, MAX_DESCRIPTION_LENGTH)
    : description;
}

/**
 * Parse a single .cook file and convert to RecipePreview
 */
async function parseRecipeFile(file: CookFile): Promise<RecipePreview | null> {
  try {
    const content = await fs.readFile(file.absolutePath, 'utf-8');
    const result = await parseCooklang(content, {
      filePath: file.relativePath,
      gitCommitHash: 'preview',
    });

    if (!result.success) {
      logger.recipes.warn('Failed to parse recipe', {
        file: file.relativePath,
        error: result.error,
      });
      return null;
    }

    const { recipe } = result;
    const preview: RecipePreview = {
      slug: recipe.slug,
      title: recipe.title,
      category: extractCategory(file.relativePath),
      ingredientCount: recipe.ingredients.length,
    };

    if (recipe.prepTime !== undefined) {
      preview.prepTime = recipe.prepTime;
    }
    if (recipe.cookTime !== undefined) {
      preview.cookTime = recipe.cookTime;
    }
    const totalTime = computeTotalTime(recipe.totalTime, recipe.prepTime, recipe.cookTime);
    if (totalTime !== undefined) {
      preview.totalTime = totalTime;
    }
    const description = truncateDescription(recipe.description);
    if (description !== undefined) {
      preview.description = description;
    }

    return preview;
  } catch (error) {
    logger.recipes.error('Error reading recipe file', error instanceof Error ? error : undefined, {
      file: file.relativePath,
    });
    return null;
  }
}

/**
 * Load all recipes from the filesystem
 *
 * @returns Array of RecipePreview objects sorted by title
 */
export async function getAllRecipes(): Promise<RecipePreview[]> {
  return withTrace('recipes.getAllRecipes', async (span) => {
    const files = await scanCooklangFiles(RECIPES_DIRECTORY);
    span.setAttribute('files_found', files.length);

    if (files.length === 0) {
      logger.recipes.warn('No recipe files found', { directory: RECIPES_DIRECTORY });
      return [];
    }

    const previews: RecipePreview[] = [];

    for (const file of files) {
      const preview = await parseRecipeFile(file);
      if (preview) {
        previews.push(preview);
      }
    }

    // Sort by title for consistent display
    previews.sort((a, b) => a.title.localeCompare(b.title));

    span.setAttribute('recipes_loaded', previews.length);
    logger.recipes.info('Loaded recipe previews', {
      total: previews.length,
      failed: files.length - previews.length,
    });

    return previews;
  });
}

/**
 * Get list of available recipe categories
 *
 * @returns Array of category names sorted alphabetically
 */
export function getCategories(): string[] {
  return ['breakfast', 'cocktails', 'desserts', 'entrees', 'salads', 'sides', 'soups'];
}

/**
 * Full recipe data for detail view
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
  }>;
  tags: string[];
}

/**
 * Convert IRecipe steps to RecipeDetail steps
 */
function convertStepsForDetail(
  steps: Array<{ text: string; timers?: Array<{ duration: number; unit: string }> }>,
): RecipeDetail['steps'] {
  return steps.map((step) => {
    const mapped: { text: string; timers?: Array<{ duration: number; unit: string }> } = {
      text: step.text,
    };
    if (step.timers && step.timers.length > 0) {
      mapped.timers = step.timers;
    }
    return mapped;
  });
}

/**
 * Apply optional fields from IRecipe to RecipeDetail
 */
function applyOptionalDetailFields(detail: RecipeDetail, recipe: IRecipe): void {
  if (recipe.description) {
    detail.description = recipe.description;
  }
  if (recipe.servings !== undefined) {
    detail.servings = recipe.servings;
  }
  if (recipe.prepTime !== undefined) {
    detail.prepTime = recipe.prepTime;
  }
  if (recipe.cookTime !== undefined) {
    detail.cookTime = recipe.cookTime;
  }
  if (recipe.totalTime !== undefined) {
    detail.totalTime = recipe.totalTime;
  }
  if (recipe.difficulty) {
    detail.difficulty = recipe.difficulty;
  }
  if (recipe.cuisine) {
    detail.cuisine = recipe.cuisine;
  }
  if (recipe.course) {
    detail.course = recipe.course;
  }
}

/**
 * Build RecipeDetail from IRecipe and file info
 */
function buildRecipeDetail(recipe: IRecipe, relativePath: string): RecipeDetail {
  const detail: RecipeDetail = {
    slug: recipe.slug,
    title: recipe.title,
    category: extractCategory(relativePath),
    ingredients: recipe.ingredients,
    cookware: recipe.cookware,
    steps: convertStepsForDetail(recipe.steps),
    tags: recipe.tags,
  };

  applyOptionalDetailFields(detail, recipe);
  return detail;
}

/**
 * Load a single recipe by slug
 *
 * @param slug - URL-safe recipe identifier
 * @returns RecipeDetail or null if not found
 */
export async function getRecipeBySlug(slug: string): Promise<RecipeDetail | null> {
  return withTrace('recipes.getRecipeBySlug', async (span) => {
    span.setAttribute('slug', slug);

    const files = await scanCooklangFiles(RECIPES_DIRECTORY);

    for (const file of files) {
      const detail = await tryParseRecipeFile(file, slug);
      if (detail) {
        logger.recipes.info('Loaded recipe detail', { slug, title: detail.title });
        return detail;
      }
    }

    logger.recipes.warn('Recipe not found', { slug });
    return null;
  });
}

/**
 * Try to parse a file and return RecipeDetail if it matches the slug
 */
async function tryParseRecipeFile(
  file: CookFile,
  targetSlug: string,
): Promise<RecipeDetail | null> {
  try {
    const content = await fs.readFile(file.absolutePath, 'utf-8');
    const result = await parseCooklang(content, {
      filePath: file.relativePath,
      gitCommitHash: 'detail',
    });

    if (!result.success || result.recipe.slug !== targetSlug) {
      return null;
    }

    return buildRecipeDetail(result.recipe, file.relativePath);
  } catch (error) {
    logger.recipes.error('Error reading recipe file', error instanceof Error ? error : undefined, {
      file: file.relativePath,
    });
    return null;
  }
}

/**
 * Raw Cooklang content with category info for editing
 */
export interface RawRecipeContent {
  /** Raw .cook file content */
  content: string;
  /** Category directory the recipe is in */
  category: string;
  /** Recipe slug */
  slug: string;
}

/**
 * Load raw Cooklang content by slug
 *
 * Returns the exact file content without transformation,
 * supporting the Cooklang-first editing approach.
 *
 * @param slug - URL-safe recipe identifier
 * @returns Raw content and category, or null if not found
 */
export async function getRawCooklangContent(slug: string): Promise<RawRecipeContent | null> {
  return withTrace('recipes.getRawCooklangContent', async (span) => {
    span.setAttribute('slug', slug);

    const files = await scanCooklangFiles(RECIPES_DIRECTORY);

    for (const file of files) {
      // Check if filename matches slug
      const filename = file.relativePath.split('/').pop() ?? '';
      const fileSlug = filename.replace(/\.cook$/, '');

      if (fileSlug !== slug) {
        continue;
      }

      try {
        const content = await fs.readFile(file.absolutePath, 'utf-8');
        const category = extractCategory(file.relativePath);

        logger.recipes.info('Loaded raw Cooklang content', { slug, category });

        return { content, category, slug };
      } catch (error) {
        logger.recipes.error(
          'Error reading recipe file',
          error instanceof Error ? error : undefined,
          { file: file.relativePath },
        );
        return null;
      }
    }

    logger.recipes.warn('Recipe not found for raw content', { slug });
    return null;
  });
}
