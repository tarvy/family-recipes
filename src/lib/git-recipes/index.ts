/**
 * Git-based recipe sync module
 *
 * Synchronizes Cooklang recipes from the filesystem to MongoDB.
 *
 * Usage:
 *   import { syncRecipes, scanCooklangFiles, discoverPhotos } from '@/lib/git-recipes';
 *
 *   // Full sync
 *   const result = await syncRecipes({ mode: 'full' });
 *
 *   // Scan for files only
 *   const files = await scanCooklangFiles('recipes');
 */

export type { CookFile } from './file-scanner';
export { getGitCommitHash, readCookFile, scanCooklangFiles } from './file-scanner';
export type { PhotoUrls, RecipePhoto } from './photo-handler';
export { discoverPhotos, processPhotos } from './photo-handler';
export type { SyncOptions, SyncResult } from './sync';
export { syncRecipes } from './sync';
