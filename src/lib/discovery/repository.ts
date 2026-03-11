/** Data access layer for DiscoveryRecipe documents. */

import { DiscoveryRecipe } from '@/db/models';
import type { DiscoverySource, IDiscoveryRecipeDocument } from '@/db/types';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';
import type { CleanedMeal } from './types';

const log = createLogger('discovery');

export async function upsertDiscoveryRecipe(
  cleaned: CleanedMeal,
  score: number,
  tags: string[],
): Promise<IDiscoveryRecipeDocument> {
  return withTrace('discovery.upsert', async () => {
    log.info('Upserting discovery recipe', {
      externalId: cleaned.externalId,
      title: cleaned.title,
    });

    const doc = await DiscoveryRecipe.findOneAndUpdate(
      { externalId: cleaned.externalId },
      {
        $set: {
          source: 'themealdb' as const,
          title: cleaned.title,
          imageUrl: cleaned.imageUrl,
          category: cleaned.category,
          cuisine: cleaned.cuisine,
          tags,
          ingredients: cleaned.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          })),
          instructions: cleaned.instructions,
          sourceUrl: cleaned.sourceUrl,
          rawData: cleaned.rawData as unknown as Record<string, unknown>,
          qualityScore: score,
          cleanedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return doc;
  });
}

export async function findByQuality(
  minScore: number,
  page: number,
  limit: number,
): Promise<IDiscoveryRecipeDocument[]> {
  return withTrace('discovery.findByQuality', async () => {
    log.info('Finding recipes by quality', { minScore, page, limit });

    return DiscoveryRecipe.find({ qualityScore: { $gte: minScore } })
      .sort({ qualityScore: -1 })
      .skip(page * limit)
      .limit(limit);
  });
}

export async function searchDiscoveryRecipes(
  query: string,
  page: number,
  limit: number,
): Promise<IDiscoveryRecipeDocument[]> {
  return withTrace('discovery.search', async () => {
    log.info('Searching discovery recipes', { query, page, limit });

    return DiscoveryRecipe.find({ $text: { $search: query } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(page * limit)
      .limit(limit);
  });
}

export async function countBySource(source: DiscoverySource): Promise<number> {
  return withTrace('discovery.countBySource', async () => {
    log.info('Counting recipes by source', { source });

    return DiscoveryRecipe.countDocuments({ source });
  });
}
