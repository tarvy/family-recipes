/**
 * Cooklang parser constants
 *
 * Defines metadata keys and default values for parsing .cook files.
 */

/** Standard Cooklang metadata keys */
export const METADATA_KEYS = {
  TITLE: 'title',
  DESCRIPTION: 'description',
  SERVINGS: 'servings',
  PREP_TIME: 'prep time',
  COOK_TIME: 'cook time',
  TOTAL_TIME: 'total time',
  DIFFICULTY: 'difficulty',
  CUISINE: 'cuisine',
  COURSE: 'course',
  SOURCE: 'source',
  TAGS: 'tags',
} as const;

/** Minutes per hour */
const MINUTES_PER_HOUR = 60;

/** Seconds to minutes conversion (1/60) */
const SECONDS_TO_MINUTES = 1 / MINUTES_PER_HOUR;

/** Time unit conversions to minutes */
export const TIME_UNIT_TO_MINUTES: Record<string, number> = {
  minute: 1,
  minutes: 1,
  min: 1,
  mins: 1,
  m: 1,
  hour: MINUTES_PER_HOUR,
  hours: MINUTES_PER_HOUR,
  hr: MINUTES_PER_HOUR,
  hrs: MINUTES_PER_HOUR,
  h: MINUTES_PER_HOUR,
  second: SECONDS_TO_MINUTES,
  seconds: SECONDS_TO_MINUTES,
  sec: SECONDS_TO_MINUTES,
  secs: SECONDS_TO_MINUTES,
  s: SECONDS_TO_MINUTES,
};

/** Default time unit when not specified */
export const DEFAULT_TIME_UNIT = 'minutes';

/** Common photo extensions to discover */
export const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

/** Maximum step photos per recipe (e.g., RecipeName.1.png through RecipeName.10.png) */
export const MAX_STEP_PHOTOS = 10;

/** Decimal radix for parseInt - always use to avoid octal interpretation */
export const DECIMAL_RADIX = 10;

/**
 * Metadata key aliases for Cooklang spec compatibility
 *
 * Maps alternative metadata keys to their canonical form.
 * Enables parsing recipes from external sources using standard Cooklang keys.
 */
export const METADATA_ALIASES: Record<string, string> = {
  // Servings aliases
  serves: METADATA_KEYS.SERVINGS,
  yield: METADATA_KEYS.SERVINGS,

  // Time aliases
  time: METADATA_KEYS.TOTAL_TIME,
  duration: METADATA_KEYS.TOTAL_TIME,
  'time required': METADATA_KEYS.TOTAL_TIME,

  // Description aliases
  introduction: METADATA_KEYS.DESCRIPTION,
};

/**
 * Normalize a metadata key to its canonical form
 *
 * Handles aliases (serves → servings, time → total time) and case normalization.
 * Returns the canonical key if an alias exists, otherwise returns the normalized input.
 *
 * @example
 * normalizeMetadataKey('Serves') // → 'servings'
 * normalizeMetadataKey('TIME') // → 'total time'
 * normalizeMetadataKey('unknown') // → 'unknown'
 */
export function normalizeMetadataKey(key: string): string {
  const normalized = key.toLowerCase().trim();
  return METADATA_ALIASES[normalized] ?? normalized;
}

/** Regex capture group indices for compact time parsing */
const COMPACT_HOURS_GROUP = 1;
const COMPACT_MINUTES_GROUP = 2;

/** Regex capture group indices for verbose time parsing */
const VERBOSE_VALUE_GROUP = 1;
const VERBOSE_UNIT_GROUP = 2;

/**
 * Parse time strings including compact notation
 *
 * Supports both compact Cooklang notation and verbose formats:
 * - Compact: "1h30m", "45m", "2h"
 * - Verbose: "30 minutes", "1 hour", "1.5 hours"
 *
 * @returns Time in minutes, or undefined if parsing fails
 *
 * @example
 * parseTimeString('1h30m') // → 90
 * parseTimeString('45m') // → 45
 * parseTimeString('2h') // → 120
 * parseTimeString('30 minutes') // → 30
 * parseTimeString('1.5 hours') // → 90
 */
export function parseTimeString(timeStr: string): number | undefined {
  const trimmed = timeStr.trim().toLowerCase();

  // Try compact format first: 1h30m, 45m, 2h
  const compactMatch = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (compactMatch && (compactMatch[COMPACT_HOURS_GROUP] || compactMatch[COMPACT_MINUTES_GROUP])) {
    const hours = Number.parseInt(compactMatch[COMPACT_HOURS_GROUP] || '0', DECIMAL_RADIX);
    const minutes = Number.parseInt(compactMatch[COMPACT_MINUTES_GROUP] || '0', DECIMAL_RADIX);
    const minutesPerHour = TIME_UNIT_TO_MINUTES['hour'] ?? MINUTES_PER_HOUR;
    return hours * minutesPerHour + minutes;
  }

  // Fall back to verbose format: "30 minutes", "1 hour"
  const verboseMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(\w+)?$/);
  if (verboseMatch?.[VERBOSE_VALUE_GROUP]) {
    const value = Number.parseFloat(verboseMatch[VERBOSE_VALUE_GROUP]);
    const unit = (verboseMatch[VERBOSE_UNIT_GROUP] ?? 'minutes').toLowerCase();
    const multiplier = TIME_UNIT_TO_MINUTES[unit] ?? 1;
    return Math.round(value * multiplier);
  }

  return undefined;
}
