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

import { connectDB } from '@/db/connection';
import { Recipe } from '@/db/models/recipe.model';
import type { IRecipeDocument } from '@/db/types';
import {
  RANDOM_COOKIE_MAX_AGE_SECONDS,
  RANDOM_RECIPES_COOKIE_NAME,
} from '@/lib/constants/random-recipes';
import { logger } from '@/lib/logger';
import {
  getAllRecipes as getAllRecipesFromDb,
  getRawCooklangContent,
  getRecipeBySlug,
  type RecipeDetail,
} from '@/lib/recipes/repository';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

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

// -----------------------------------------------------------------------------
// Recipe Sections (PR-044)
// -----------------------------------------------------------------------------

/** Default number of recipes per section */
const SECTION_LIMIT = 6;

// Re-export cookie constants for consumers that import from loader
export { RANDOM_COOKIE_MAX_AGE_SECONDS, RANDOM_RECIPES_COOKIE_NAME };

/**
 * Data for curated recipe sections on the main page
 */
export interface RecipeSectionsData {
  mostUsed: RecipePreview[];
  recentlyUsed: RecipePreview[];
  recentlyAdded: RecipePreview[];
  random: RecipePreview[];
  /** Slugs of random recipes for cookie persistence */
  randomSlugs: string[];
}

/**
 * Load random recipes, using cached slugs if available.
 *
 * When cachedSlugs are provided, fetches those specific recipes by slug.
 * Falls back to $sample if no cache or cached recipes no longer exist.
 */
async function getRandomRecipes(
  cachedSlugs: string[] | null,
  limit: number,
): Promise<{ recipes: RecipePreview[]; slugs: string[] }> {
  return withTrace('recipes.getRandomRecipes', async (span) => {
    if (cachedSlugs && cachedSlugs.length > 0) {
      span.setAttribute('source', 'cache');
      const docs = await traceDbQuery('find', 'recipes', () =>
        Recipe.find({ slug: { $in: cachedSlugs } }).exec(),
      );

      if (docs.length > 0) {
        const recipes = docs.map(docToRecipePreview);
        return { recipes, slugs: recipes.map((r) => r.slug) };
      }
    }

    span.setAttribute('source', 'sample');
    const docs = await traceDbQuery('aggregate', 'recipes', () =>
      Recipe.aggregate<IRecipeDocument>([{ $sample: { size: limit } }]).exec(),
    );
    const recipes = docs.map(docToRecipePreview);
    return { recipes, slugs: recipes.map((r) => r.slug) };
  });
}

/**
 * Load curated recipe sections for the main page.
 *
 * Runs 4 queries in parallel via Promise.all:
 * - Most Used: top recipes by useCount (excludes zero)
 * - Recently Used: most recently viewed recipes
 * - Recently Added: newest recipes by createdAt
 * - Random: cached slugs or random sample via MongoDB $sample
 *
 * @param cachedRandomSlugs - Previously cached random recipe slugs, or null
 * @param limit - Number of recipes per section
 */
export async function getRecipeSections(
  cachedRandomSlugs: string[] | null = null,
  limit = SECTION_LIMIT,
): Promise<RecipeSectionsData> {
  return withTrace('recipes.getRecipeSections', async (span) => {
    await connectDB();

    const [mostUsedDocs, recentlyUsedDocs, recentlyAddedDocs, randomResult] = await Promise.all([
      traceDbQuery('find', 'recipes', () =>
        Recipe.find({ useCount: { $gt: 0 } })
          .sort({ useCount: -1 })
          .limit(limit)
          .exec(),
      ),
      traceDbQuery('find', 'recipes', () =>
        Recipe.find({ lastUsedAt: { $ne: null } })
          .sort({ lastUsedAt: -1 })
          .limit(limit)
          .exec(),
      ),
      traceDbQuery('find', 'recipes', () =>
        Recipe.find().sort({ createdAt: -1 }).limit(limit).exec(),
      ),
      getRandomRecipes(cachedRandomSlugs, limit),
    ]);

    const sections: RecipeSectionsData = {
      mostUsed: mostUsedDocs.map(docToRecipePreview),
      recentlyUsed: recentlyUsedDocs.map(docToRecipePreview),
      recentlyAdded: recentlyAddedDocs.map(docToRecipePreview),
      random: randomResult.recipes,
      randomSlugs: randomResult.slugs,
    };

    span.setAttribute('mostUsed', sections.mostUsed.length);
    span.setAttribute('recentlyUsed', sections.recentlyUsed.length);
    span.setAttribute('recentlyAdded', sections.recentlyAdded.length);
    span.setAttribute('random', sections.random.length);

    logger.recipes.debug('Loaded recipe sections', {
      mostUsed: sections.mostUsed.length,
      recentlyUsed: sections.recentlyUsed.length,
      recentlyAdded: sections.recentlyAdded.length,
      random: sections.random.length,
    });

    return sections;
  });
}
