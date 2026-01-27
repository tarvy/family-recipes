/**
 * Recipe sync orchestration
 *
 * Synchronizes Cooklang recipes from the filesystem to MongoDB.
 *
 * Usage:
 *   import { syncRecipes } from '@/lib/git-recipes';
 *
 *   const result = await syncRecipes({
 *     mode: 'full',      // or 'incremental'
 *     dryRun: false,
 *   });
 */

import path from 'node:path';
import { connectDB } from '@/db/connection';
import { Recipe } from '@/db/models/recipe.model';
import type { IRecipe } from '@/db/types';
import { parseCooklang } from '@/lib/cooklang';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import { type CookFile, getGitCommitHash, readCookFile, scanCooklangFiles } from './file-scanner';
import { discoverPhotos, processPhotos } from './photo-handler';

/** Default recipes directory (relative to cwd) */
const DEFAULT_RECIPES_DIR = 'recipes';

export interface SyncOptions {
  /** Sync mode: 'full' replaces all, 'incremental' updates only changed */
  mode?: 'full' | 'incremental';
  /** If true, don't write to database */
  dryRun?: boolean;
  /** Custom recipes directory path */
  directory?: string;
}

export interface SyncResult {
  success: boolean;
  summary: {
    scanned: number;
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{ filePath: string; error: string }>;
  durationMs: number;
}

interface ProcessedRecipe {
  filePath: string;
  recipe: IRecipe;
}

type ExistingRecipeMap = Map<string, { gitCommitHash: string }>;

/**
 * Create a fresh SyncResult object
 */
function createSyncResult(): SyncResult {
  return {
    success: true,
    summary: {
      scanned: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
    },
    errors: [],
    durationMs: 0,
  };
}

/**
 * Process a single cook file into a recipe
 */
async function processFile(
  file: CookFile,
  gitCommitHash: string,
  baseDir: string,
): Promise<{ success: true; recipe: IRecipe } | { success: false; error: string }> {
  try {
    const source = await readCookFile(file.absolutePath);
    const parseResult = await parseCooklang(source, {
      filePath: file.relativePath,
      gitCommitHash,
    });

    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }

    const photos = await discoverPhotos(file.absolutePath, baseDir);
    const photoUrls = await processPhotos(photos);

    const recipe: IRecipe = {
      ...parseResult.recipe,
      photoUrls: photoUrls.photoUrls,
    };

    if (photoUrls.primaryPhotoUrl) {
      recipe.primaryPhotoUrl = photoUrls.primaryPhotoUrl;
    }

    return { success: true, recipe };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load existing recipes from database for incremental comparison
 */
async function loadExistingRecipes(): Promise<ExistingRecipeMap> {
  const map: ExistingRecipeMap = new Map();
  const existing = await traceDbQuery('find', 'recipes', async () => {
    return Recipe.find({}, { filePath: 1, gitCommitHash: 1 }).lean();
  });
  for (const r of existing) {
    map.set(r.filePath, { gitCommitHash: r.gitCommitHash });
  }
  return map;
}

/**
 * Check if a file should be skipped in incremental mode
 */
function shouldSkipFile(
  file: CookFile,
  mode: 'full' | 'incremental',
  gitCommitHash: string,
  existingRecipes: ExistingRecipeMap,
): boolean {
  if (mode !== 'incremental') {
    return false;
  }
  const existing = existingRecipes.get(file.relativePath);
  return existing !== undefined && existing.gitCommitHash === gitCommitHash;
}

/**
 * Upsert a recipe to the database
 */
async function upsertRecipe(filePath: string, recipe: IRecipe): Promise<void> {
  await traceDbQuery('upsert', 'recipes', async () => {
    await Recipe.findOneAndUpdate(
      { filePath },
      {
        $set: {
          ...recipe,
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
  });
}

/**
 * Delete recipes not in the synced paths
 */
async function deleteRemovedRecipes(syncedPaths: Set<string>): Promise<number> {
  const deleteResult = await traceDbQuery('deleteMany', 'recipes', async () => {
    return Recipe.deleteMany({
      filePath: { $nin: Array.from(syncedPaths) },
    });
  });
  return deleteResult.deletedCount;
}

/**
 * Process all files and update the result
 */
async function processFiles(
  files: CookFile[],
  mode: 'full' | 'incremental',
  gitCommitHash: string,
  baseDir: string,
  existingRecipes: ExistingRecipeMap,
  result: SyncResult,
): Promise<{ processedRecipes: ProcessedRecipe[]; syncedPaths: Set<string> }> {
  const processedRecipes: ProcessedRecipe[] = [];
  const syncedPaths = new Set<string>();

  for (const file of files) {
    if (shouldSkipFile(file, mode, gitCommitHash, existingRecipes)) {
      result.summary.skipped++;
      syncedPaths.add(file.relativePath);
      continue;
    }

    const processed = await processFile(file, gitCommitHash, baseDir);

    if (!processed.success) {
      result.summary.errors++;
      result.errors.push({ filePath: file.relativePath, error: processed.error });
      continue;
    }

    processedRecipes.push({ filePath: file.relativePath, recipe: processed.recipe });
    syncedPaths.add(file.relativePath);
  }

  return { processedRecipes, syncedPaths };
}

/**
 * Save processed recipes to the database
 */
async function saveRecipes(
  processedRecipes: ProcessedRecipe[],
  existingRecipes: ExistingRecipeMap,
  dryRun: boolean,
  result: SyncResult,
): Promise<void> {
  for (const { filePath, recipe } of processedRecipes) {
    const isExisting = existingRecipes.has(filePath);

    if (!dryRun) {
      await upsertRecipe(filePath, recipe);
    }

    if (isExisting) {
      result.summary.updated++;
    } else {
      result.summary.created++;
    }
  }
}

/**
 * Resolve the base directory path
 */
function resolveBaseDir(directory: string): string {
  return path.isAbsolute(directory) ? directory : path.resolve(process.cwd(), directory);
}

interface SyncContext {
  mode: 'full' | 'incremental';
  dryRun: boolean;
  directory: string;
  startTime: number;
}

/**
 * Execute the core sync logic
 */
async function executeSyncCore(ctx: SyncContext, result: SyncResult): Promise<void> {
  if (!ctx.dryRun) {
    await connectDB();
  }

  const gitCommitHash = await getGitCommitHash();
  const files = await scanCooklangFiles(ctx.directory);
  result.summary.scanned = files.length;

  if (files.length === 0) {
    logger.recipes.warn('No cook files found', { directory: ctx.directory });
    return;
  }

  const baseDir = resolveBaseDir(ctx.directory);
  const existingRecipes =
    ctx.mode === 'incremental' && !ctx.dryRun ? await loadExistingRecipes() : new Map();

  const { processedRecipes, syncedPaths } = await processFiles(
    files,
    ctx.mode,
    gitCommitHash,
    baseDir,
    existingRecipes,
    result,
  );

  if (processedRecipes.length > 0) {
    await saveRecipes(processedRecipes, existingRecipes, ctx.dryRun, result);
  }

  if (ctx.mode === 'full' && !ctx.dryRun) {
    result.summary.deleted = await deleteRemovedRecipes(syncedPaths);
  }

  result.success = result.summary.errors === 0;
  logger.recipes.info('Recipe sync completed', {
    mode: ctx.mode,
    dryRun: ctx.dryRun,
    ...result.summary,
  });
}

/**
 * Synchronize recipes from filesystem to MongoDB
 */
export async function syncRecipes(options: SyncOptions = {}): Promise<SyncResult> {
  const ctx: SyncContext = {
    mode: options.mode ?? 'full',
    dryRun: options.dryRun ?? false,
    directory: options.directory ?? process.env['RECIPES_DIRECTORY'] ?? DEFAULT_RECIPES_DIR,
    startTime: Date.now(),
  };

  return withTrace('git-recipes.sync', async (span) => {
    span.setAttribute('mode', ctx.mode);
    span.setAttribute('dry_run', ctx.dryRun);
    span.setAttribute('directory', ctx.directory);

    const result = createSyncResult();

    try {
      await executeSyncCore(ctx, result);
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ filePath: '*', error: message });
      logger.recipes.error('Recipe sync failed', error instanceof Error ? error : undefined);
    }

    result.durationMs = Date.now() - ctx.startTime;
    span.setAttribute('duration_ms', result.durationMs);
    span.setAttribute('success', result.success);

    return result;
  });
}
