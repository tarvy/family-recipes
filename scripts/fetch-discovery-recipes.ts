/** CLI script to fetch, clean, and store all TheMealDB recipes into the discovery pool. Run via `npx tsx scripts/fetch-discovery-recipes.ts`. */

import nextEnv from '@next/env';
import { connectDB, disconnectDB } from '@/db/connection';
import { cleanMeal } from '@/lib/discovery/cleaner';
import { fetchAll } from '@/lib/discovery/client';
import { upsertDiscoveryRecipe } from '@/lib/discovery/repository';
import { scoreRecipe } from '@/lib/discovery/scorer';
import { generateTags } from '@/lib/discovery/tagger';
import { createLogger } from '@/lib/logger';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const log = createLogger('discovery-cli');

let totalFetched = 0;
let totalCleaned = 0;
let totalStored = 0;
let totalErrors = 0;
let scoreSum = 0;

process.on('SIGINT', async () => {
  log.info('Interrupted, disconnecting...');
  await disconnectDB();
  process.exit(0);
});

async function main(): Promise<void> {
  log.info('Starting TheMealDB fetch...');
  await connectDB();

  for await (const batch of fetchAll((letter, count) => {
    log.info('Fetched letter', { letter, count });
  })) {
    totalFetched += batch.length;

    for (const raw of batch) {
      try {
        const cleaned = cleanMeal(raw);
        const tags = generateTags(cleaned);
        const score = scoreRecipe(cleaned);
        await upsertDiscoveryRecipe(cleaned, score, tags);
        totalCleaned++;
        totalStored++;
        scoreSum += score;
      } catch (error) {
        totalErrors++;
        log.warn('Failed to process meal', {
          mealId: raw.idMeal,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  log.info('Fetch complete', {
    totalFetched,
    totalCleaned,
    totalStored,
    totalErrors,
    averageScore: Math.round(scoreSum / totalStored) || 0,
  });

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error('Fatal error', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });
