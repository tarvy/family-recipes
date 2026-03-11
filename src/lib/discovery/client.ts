/** TheMealDB HTTP client utilities for discovery ingestion. */

import type {
  FetchProgressCallback,
  TheMealDBMeal,
  TheMealDBResponse,
} from '@/lib/discovery/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('discovery');

const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const FETCH_DELAY_MS = 100;

export async function fetchByLetter(letter: string): Promise<TheMealDBMeal[]> {
  try {
    const response = await fetch(`${THEMEALDB_BASE_URL}/search.php?s=${letter}`);

    if (!response.ok) {
      log.warn('TheMealDB request failed', {
        letter,
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const payload = (await response.json()) as TheMealDBResponse;
    return payload.meals ?? [];
  } catch (error) {
    log.warn('TheMealDB request errored', {
      letter,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return [];
  }
}

export async function* fetchAll(
  onProgress?: FetchProgressCallback,
): AsyncGenerator<TheMealDBMeal[], void, unknown> {
  for (const letter of LETTERS) {
    let meals: TheMealDBMeal[] = [];

    try {
      meals = await fetchByLetter(letter);
    } catch (error) {
      log.warn('Letter fetch failed unexpectedly', {
        letter,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      meals = [];
    }

    onProgress?.(letter, meals.length);
    yield meals;

    await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
  }
}
