/**
 * Recipe writer utility
 *
 * Writes recipe data to .cook files on the filesystem.
 *
 * Usage:
 *   import { writeRecipe, deleteRecipeFile } from '@/lib/recipes/writer';
 *
 *   await writeRecipe(recipe, 'entrees');
 *   await deleteRecipeFile('beef-stroganoff', 'entrees');
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { IRecipe } from '@/db/types';
import { serializeToCooklang } from '@/lib/cooklang/serializer';
import { logger } from '@/lib/logger';

/** Default recipes directory relative to project root */
const RECIPES_DIRECTORY = 'recipes';

/**
 * Write a recipe to a .cook file
 *
 * @param recipe - The recipe data to write
 * @param category - The category directory (e.g., 'entrees', 'desserts')
 */
export async function writeRecipe(recipe: IRecipe, category: string): Promise<void> {
  const categoryDir = path.join(process.cwd(), RECIPES_DIRECTORY, category);

  // Ensure category directory exists
  await fs.mkdir(categoryDir, { recursive: true });

  const filePath = path.join(categoryDir, `${recipe.slug}.cook`);
  const content = serializeToCooklang(recipe);

  await fs.writeFile(filePath, content, 'utf-8');

  logger.recipes.info('Recipe file written', { slug: recipe.slug, category, filePath });
}

/**
 * Delete a recipe file
 *
 * @param slug - The recipe slug (filename without extension)
 * @param category - The category directory
 */
export async function deleteRecipeFile(slug: string, category: string): Promise<void> {
  const filePath = path.join(process.cwd(), RECIPES_DIRECTORY, category, `${slug}.cook`);

  try {
    await fs.unlink(filePath);
    logger.recipes.info('Recipe file deleted', { slug, category, filePath });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    logger.recipes.warn('Recipe file not found for deletion', { slug, category });
  }
}

/**
 * Check if a recipe file exists
 *
 * @param slug - The recipe slug
 * @param category - The category directory
 * @returns True if the file exists
 */
export async function recipeFileExists(slug: string, category: string): Promise<boolean> {
  const filePath = path.join(process.cwd(), RECIPES_DIRECTORY, category, `${slug}.cook`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the file path for a recipe
 *
 * @param slug - The recipe slug
 * @param category - The category directory
 * @returns The absolute file path
 */
export function getRecipeFilePath(slug: string, category: string): string {
  return path.join(process.cwd(), RECIPES_DIRECTORY, category, `${slug}.cook`);
}
