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
