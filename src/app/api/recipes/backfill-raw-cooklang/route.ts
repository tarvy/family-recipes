/**
 * POST /api/recipes/backfill-raw-cooklang
 *
 * Backfill rawCooklang field for recipes synced from .cook files.
 * Reads source from disk when available, falls back to serializer.
 *
 * Auth: Session with owner or family role.
 *
 * Response: { backfilled: number, failed: string[], skipped: number }
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { Recipe } from '@/db/models/recipe.model';
import { getSessionFromCookies } from '@/lib/auth';
import {
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { serializeToCooklang } from '@/lib/cooklang';
import { toError } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { getRecipesNeedingRawCooklangBackfill } from '@/lib/recipes/repository';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Allowed roles for backfill */
const ALLOWED_ROLES = new Set(['owner', 'family']);

/** Recipes directory (relative to cwd) */
const RECIPES_DIR = process.env['RECIPES_DIRECTORY'] ?? 'recipes';

interface BackfillResult {
  backfilled: number;
  failed: string[];
  skipped: number;
}

/**
 * Read a .cook file from disk, returns null if not found
 */
async function readCookFileFromDisk(filePath: string): Promise<string | null> {
  try {
    const fullPath = path.resolve(process.cwd(), RECIPES_DIR, filePath);
    return await readFile(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Get serialized content as fallback when .cook file is missing
 */
async function getFallbackContent(slug: string): Promise<string | null> {
  const doc = await traceDbQuery('findOne', 'recipes', async () => {
    return Recipe.findOne({ slug }).lean().exec();
  });

  if (!doc) {
    return null;
  }

  return serializeToCooklang(doc);
}

/**
 * Extract category from file path (e.g., "entrees/foo.cook" -> "entrees")
 */
function extractCategory(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length > 1 && parts[0] ? parts[0] : 'uncategorized';
}

/**
 * Process a single recipe for backfill
 */
async function processRecipe(
  recipe: { slug: string; filePath: string; category?: string },
  result: BackfillResult,
): Promise<void> {
  const { slug, filePath } = recipe;

  let content = await readCookFileFromDisk(filePath);
  let contentSource = 'disk';

  if (!content) {
    content = await getFallbackContent(slug);
    contentSource = 'serializer';
  }

  if (!content) {
    result.failed.push(slug);
    logger.recipes.warn('Backfill failed: no content source', { slug, filePath });
    return;
  }

  const category = recipe.category ?? extractCategory(filePath);

  const updateResult = await traceDbQuery('updateOne', 'recipes', async () => {
    return Recipe.updateOne(
      { slug },
      { $set: { rawCooklang: content, category, source: 'sync' as const } },
    ).exec();
  });

  if (updateResult.modifiedCount > 0) {
    result.backfilled++;
    logger.recipes.info('Backfilled rawCooklang', { slug, contentSource });
  } else {
    result.skipped++;
  }
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.backfillRawCooklang', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      if (!ALLOWED_ROLES.has(user.role)) {
        span.setAttribute('error', 'forbidden');
        logger.recipes.warn('Unauthorized backfill attempt', { userId: user.id, role: user.role });
        return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
      }

      try {
        const candidates = await getRecipesNeedingRawCooklangBackfill();
        span.setAttribute('candidates', candidates.length);

        const result: BackfillResult = { backfilled: 0, failed: [], skipped: 0 };

        for (const recipe of candidates) {
          await processRecipe(recipe, result);
        }

        span.setAttribute('backfilled', result.backfilled);
        span.setAttribute('failed', result.failed.length);
        span.setAttribute('skipped', result.skipped);

        logger.recipes.info('Backfill completed', {
          backfilled: result.backfilled,
          failed: result.failed.length,
          skipped: result.skipped,
        });

        return Response.json(result);
      } catch (error) {
        span.setAttribute('error', 'backfill_failed');
        logger.recipes.error('Backfill failed', toError(error));
        return Response.json({ error: 'backfill_failed' }, { status: HTTP_INTERNAL_SERVER_ERROR });
      }
    }),
  );
}
