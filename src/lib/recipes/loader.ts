/**
 * Recipe loader for UI display.
 *
 * Reads from MongoDB only. Filesystem (.cook files) is for sync only (git push →
 * parse → MongoDB); UI always reads from MongoDB.
 *
 * Usage:
 *   import { getAllRecipes, getCategories } from '@/lib/recipes/loader';
 *
 *   const recipes = await getAllRecipes();
 *   const categories = getCategories();
 */

import type { IRecipeDocument } from '@/db/types';
import { logger } from '@/lib/logger';
import {
  getAllRecipes as getAllRecipesFromDb,
  getRawCooklangContent,
  getRecipeBySlug,
  type RecipeDetail,
} from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';

// Re-export repository functions used by consumers that import from loader
export { getRecipeBySlug, getRawCooklangContent, type RecipeDetail };

/** Maximum description length for preview cards */
const MAX_DESCRIPTION_LENGTH = 150;

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
 * Convert MongoDB recipe document to RecipePreview
 */
function docToRecipePreview(doc: IRecipeDocument): RecipePreview {
  const totalTime = computeTotalTime(doc.totalTime, doc.prepTime, doc.cookTime);
  const category = doc.category ?? (doc.filePath ? extractCategory(doc.filePath) : 'uncategorized');
  const description = truncateDescription(doc.description);

  const preview: RecipePreview = {
    slug: doc.slug,
    title: doc.title,
    category,
    ingredientCount: doc.ingredients?.length ?? 0,
  };

  if (doc.prepTime !== undefined) {
    preview.prepTime = doc.prepTime;
  }
  if (doc.cookTime !== undefined) {
    preview.cookTime = doc.cookTime;
  }
  if (totalTime !== undefined) {
    preview.totalTime = totalTime;
  }
  if (description !== undefined) {
    preview.description = description;
  }

  return preview;
}

/**
 * Load all recipes from MongoDB.
 *
 * @returns Array of RecipePreview objects sorted by title
 */
export async function getAllRecipes(): Promise<RecipePreview[]> {
  return withTrace('recipes.getAllRecipes', async (span) => {
    const docs = await getAllRecipesFromDb();
    const previews = docs.map(docToRecipePreview);
    previews.sort((a, b) => a.title.localeCompare(b.title));
    span.setAttribute('recipes_loaded', previews.length);
    logger.recipes.info('Loaded recipe previews', { total: previews.length });
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
