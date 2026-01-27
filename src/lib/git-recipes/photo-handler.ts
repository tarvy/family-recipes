/**
 * Photo discovery and handling for recipes
 *
 * Discovers photos associated with recipe files using Cooklang conventions.
 *
 * Photo naming convention:
 * - Primary: RecipeName.jpg (or .png, .webp)
 * - Step photos: RecipeName.1.jpg, RecipeName.2.jpg, etc.
 *
 * Usage:
 *   import { discoverPhotos } from '@/lib/git-recipes';
 *
 *   const photos = await discoverPhotos('/path/to/recipe.cook');
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getImageURL } from '@cooklang/cooklang-ts';
import { MAX_STEP_PHOTOS, PHOTO_EXTENSIONS } from '@/lib/cooklang/constants';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export interface RecipePhoto {
  /** Absolute path to the photo file */
  absolutePath: string;
  /** Path relative to the recipes directory */
  relativePath: string;
  /** Whether this is the primary/main photo */
  isPrimary: boolean;
  /** Step number if this is a step photo (1-indexed) */
  stepNumber?: number;
  /** File extension */
  extension: string;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the primary photo for a recipe
 */
async function findPrimaryPhoto(
  dir: string,
  recipeName: string,
  baseDir: string,
): Promise<RecipePhoto | null> {
  for (const ext of PHOTO_EXTENSIONS) {
    const primaryName = getImageURL(recipeName, { extension: ext as 'png' | 'jpg' });
    const primaryPath = path.join(dir, primaryName);

    if (await fileExists(primaryPath)) {
      return {
        absolutePath: primaryPath,
        relativePath: path.relative(baseDir, primaryPath),
        isPrimary: true,
        extension: ext,
      };
    }
  }
  return null;
}

/**
 * Find a step photo for a specific step number
 */
async function findStepPhoto(
  dir: string,
  recipeName: string,
  step: number,
  baseDir: string,
): Promise<RecipePhoto | null> {
  for (const ext of PHOTO_EXTENSIONS) {
    const stepName = getImageURL(recipeName, { step, extension: ext as 'png' | 'jpg' });
    const stepPath = path.join(dir, stepName);

    if (await fileExists(stepPath)) {
      return {
        absolutePath: stepPath,
        relativePath: path.relative(baseDir, stepPath),
        isPrimary: false,
        stepNumber: step,
        extension: ext,
      };
    }
  }
  return null;
}

/**
 * Discover photos associated with a recipe file
 *
 * Uses Cooklang naming conventions:
 * - Primary photo: same name as recipe with image extension
 * - Step photos: recipe name with step number
 *
 * @param cookFilePath - Absolute path to the .cook file
 * @param baseDir - Base directory for relative path calculation
 * @returns Array of discovered photos
 */
export async function discoverPhotos(
  cookFilePath: string,
  baseDir: string,
): Promise<RecipePhoto[]> {
  return withTrace('git-recipes.discover-photos', async (span) => {
    const photos: RecipePhoto[] = [];
    const dir = path.dirname(cookFilePath);
    const recipeName = path.basename(cookFilePath, '.cook');

    span.setAttribute('recipe_name', recipeName);

    // Look for primary photo
    const primaryPhoto = await findPrimaryPhoto(dir, recipeName, baseDir);
    if (primaryPhoto) {
      photos.push(primaryPhoto);
    }

    // Look for step photos
    let hasStepPhotos = false;
    for (let step = 1; step <= MAX_STEP_PHOTOS; step++) {
      const stepPhoto = await findStepPhoto(dir, recipeName, step, baseDir);
      if (stepPhoto) {
        photos.push(stepPhoto);
        hasStepPhotos = true;
      } else if (hasStepPhotos) {
        // Stop if we hit a gap after finding some step photos
        break;
      }
    }

    span.setAttribute('photos_found', photos.length);

    if (photos.length > 0) {
      logger.recipes.debug('Discovered photos for recipe', {
        recipeName,
        photoCount: photos.length,
        hasPrimary: primaryPhoto !== null,
      });
    }

    return photos;
  });
}

/**
 * Get photo URLs for a recipe (for future Vercel Blob integration)
 *
 * Currently returns local file paths. When Vercel Blob is integrated,
 * this will return blob URLs after upload.
 */
export interface PhotoUrls {
  primaryPhotoUrl?: string;
  photoUrls: string[];
}

/**
 * Process photos for a recipe - returns URLs for storage
 *
 * Note: Currently returns relative paths. Future implementation will
 * upload to Vercel Blob and return public URLs.
 */
export async function processPhotos(photos: RecipePhoto[]): Promise<PhotoUrls> {
  const result: PhotoUrls = {
    photoUrls: [],
  };

  const primary = photos.find((p) => p.isPrimary);
  if (primary) {
    // Future: Upload to Vercel Blob and get URL
    result.primaryPhotoUrl = primary.relativePath;
  }

  // Add all photo paths (including primary)
  result.photoUrls = photos.map((p) => p.relativePath);

  return result;
}
