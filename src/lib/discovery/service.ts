/** Discovery recipe browsing, state tracking, and refresh service. */

import { Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { DiscoveryRecipe, UserDiscoveryState } from '@/db/models';
import type {
  DiscoveryAction,
  IDiscoveryRecipeDocument,
  IUserDiscoveryStateDocument,
} from '@/db/types';
import { cleanMeal } from '@/lib/discovery/cleaner';
import { fetchAll } from '@/lib/discovery/client';
import { upsertDiscoveryRecipe } from '@/lib/discovery/repository';
import { MIN_QUALITY_SCORE, scoreRecipe } from '@/lib/discovery/scorer';
import { generateTags } from '@/lib/discovery/tagger';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

const log = createLogger('discovery');

/** Paginated list of discovery recipes. */
export interface DiscoveryListResult {
  recipes: IDiscoveryRecipeDocument[];
  total: number;
  page: number;
}

/** Counts returned after a refresh run. */
export interface RefreshResult {
  added: number;
  updated: number;
  total: number;
}

/**
 * List or search discovery recipes with pagination.
 *
 * When a query is provided, performs a text search on title and tags.
 * Otherwise returns recipes ordered by quality score descending.
 * Only includes recipes with qualityScore >= MIN_QUALITY_SCORE (60).
 */
export async function listDiscoveryRecipes(
  page: number,
  limit: number,
  query?: string,
): Promise<DiscoveryListResult> {
  return withTrace('discovery.list', async (span) => {
    await connectDB();
    span.setAttributes({ page, limit, query: query ?? '' });

    const skip = (page - 1) * limit;

    if (query) {
      log.info('Searching discovery recipes', { query, page, limit });
      const filter = {
        $text: { $search: query },
        qualityScore: { $gte: MIN_QUALITY_SCORE },
      };
      const [recipes, total] = await Promise.all([
        DiscoveryRecipe.find(filter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit),
        DiscoveryRecipe.countDocuments(filter),
      ]);
      return { recipes, total, page };
    }

    log.info('Listing discovery recipes', { page, limit });
    const filter = { qualityScore: { $gte: MIN_QUALITY_SCORE } };
    const [recipes, total] = await Promise.all([
      DiscoveryRecipe.find(filter).sort({ qualityScore: -1 }).skip(skip).limit(limit),
      DiscoveryRecipe.countDocuments(filter),
    ]);
    return { recipes, total, page };
  });
}

/**
 * Track a user's interaction with a discovery recipe.
 *
 * Upserts by userId + externalId so repeated interactions update
 * rather than duplicate.
 */
export async function trackUserState(
  userId: string,
  externalId: string,
  action: DiscoveryAction,
): Promise<IUserDiscoveryStateDocument> {
  return withTrace('discovery.trackState', async (span) => {
    await connectDB();
    span.setAttribute('action', action);
    log.info('Tracking user discovery state', {
      userId,
      externalId,
      action,
    });

    return UserDiscoveryState.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        externalId,
      },
      { $set: { action } },
      { upsert: true, new: true },
    );
  });
}

/**
 * Batch-fetch user states for a list of external IDs.
 *
 * Returns a map of externalId → action for the given user, useful
 * for rendering saved/dismissed indicators in the discovery UI.
 */
export async function getUserStates(
  userId: string,
  externalIds: string[],
): Promise<Map<string, DiscoveryAction>> {
  return withTrace('discovery.getUserStates', async () => {
    await connectDB();

    const states = await UserDiscoveryState.find({
      userId: new Types.ObjectId(userId),
      externalId: { $in: externalIds },
    });

    const result = new Map<string, DiscoveryAction>();
    for (const state of states) {
      result.set(state.externalId, state.action);
    }
    return result;
  });
}

/**
 * Re-fetch all recipes from TheMealDB, clean, score, tag, and upsert.
 *
 * Mirrors the CLI pipeline (scripts/fetch-discovery-recipes.ts) but
 * exposed as a service function for the refresh API endpoint.
 * Runs synchronously — TheMealDB has ~300 recipes.
 */
interface RefreshCounters {
  added: number;
  updated: number;
}

async function processAndUpsertMeal(
  raw: Parameters<typeof cleanMeal>[0],
  existingIds: Set<string>,
  counters: RefreshCounters,
): Promise<void> {
  try {
    const cleaned = cleanMeal(raw);
    const tags = generateTags(cleaned);
    const score = scoreRecipe(cleaned);
    await upsertDiscoveryRecipe(cleaned, score, tags);

    if (existingIds.has(cleaned.externalId)) {
      counters.updated++;
    } else {
      counters.added++;
    }
  } catch (error) {
    log.warn('Failed to process meal during refresh', {
      mealId: raw.idMeal,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function refreshFromSource(): Promise<RefreshResult> {
  return withTrace('discovery.refresh', async () => {
    await connectDB();
    log.info('Starting discovery refresh from TheMealDB');

    const existingIds = new Set((await DiscoveryRecipe.distinct('externalId')).map(String));
    const counters: RefreshCounters = { added: 0, updated: 0 };

    for await (const batch of fetchAll((letter, count) => {
      log.info('Fetched letter', { letter, count });
    })) {
      for (const raw of batch) {
        await processAndUpsertMeal(raw, existingIds, counters);
      }
    }

    const total = await DiscoveryRecipe.countDocuments();
    log.info('Discovery refresh complete', {
      added: counters.added,
      updated: counters.updated,
      total,
    });
    return { added: counters.added, updated: counters.updated, total };
  });
}
