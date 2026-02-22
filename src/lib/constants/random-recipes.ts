/**
 * Constants for random recipe cookie persistence.
 *
 * Extracted to a standalone file so both server (loader.ts) and client
 * components (shuffle-button, cookie-setter) can import without pulling
 * in server-only dependencies like logger or telemetry.
 */

import { HOURS_PER_DAY, SECONDS_PER_MINUTE } from '@/lib/constants/time';

/** Cookie name for persisting random recipe slugs */
export const RANDOM_RECIPES_COOKIE_NAME = 'random-recipes';

/** Cookie TTL: 24 hours in seconds */
export const RANDOM_COOKIE_MAX_AGE_SECONDS =
  HOURS_PER_DAY * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE;
