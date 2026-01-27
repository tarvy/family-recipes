/**
 * Ingredient aggregation utilities for shopping lists.
 *
 * Pure functions for parsing, normalizing, and combining ingredients
 * from multiple recipes into a deduplicated shopping list.
 */

import type { IIngredient } from '@/db/types';
import { categorizeIngredient, type GroceryCategory } from './categories';

/**
 * Parsed quantity from an ingredient string
 */
export interface ParsedQuantity {
  amount: number;
  unit: string;
}

/**
 * A quantity with its source recipe
 */
export interface QuantitySource {
  amount: number | null;
  unit: string;
  recipeSlug: string;
}

/**
 * An ingredient aggregated from multiple recipes
 */
export interface AggregatedIngredient {
  /** Unique ID for the item */
  id: string;
  /** Normalized ingredient name */
  name: string;
  /** Original quantities from each recipe */
  quantities: QuantitySource[];
  /** Combined display quantity string */
  displayQuantity: string;
  /** Grocery store category */
  category: GroceryCategory;
}

/**
 * Recipe with ingredients for aggregation
 */
export interface RecipeIngredients {
  slug: string;
  ingredients: IIngredient[];
  servingsMultiplier?: number;
}

/** Fraction decimal values */
const FRACTION_HALF = 0.5;
const FRACTION_THIRD = 1 / 3;
const FRACTION_TWO_THIRDS = 2 / 3;
const FRACTION_QUARTER = 0.25;
const FRACTION_THREE_QUARTERS = 0.75;
const FRACTION_FIFTH = 0.2;
const FRACTION_TWO_FIFTHS = 0.4;
const FRACTION_THREE_FIFTHS = 0.6;
const FRACTION_FOUR_FIFTHS = 0.8;
const FRACTION_SIXTH = 1 / 6;
const FRACTION_FIVE_SIXTHS = 5 / 6;
const FRACTION_EIGHTH = 0.125;
const FRACTION_THREE_EIGHTHS = 0.375;
const FRACTION_FIVE_EIGHTHS = 0.625;
const FRACTION_SEVEN_EIGHTHS = 0.875;

/** Fraction patterns for parsing */
const FRACTION_MAP: Record<string, number> = {
  '½': FRACTION_HALF,
  '⅓': FRACTION_THIRD,
  '⅔': FRACTION_TWO_THIRDS,
  '¼': FRACTION_QUARTER,
  '¾': FRACTION_THREE_QUARTERS,
  '⅕': FRACTION_FIFTH,
  '⅖': FRACTION_TWO_FIFTHS,
  '⅗': FRACTION_THREE_FIFTHS,
  '⅘': FRACTION_FOUR_FIFTHS,
  '⅙': FRACTION_SIXTH,
  '⅚': FRACTION_FIVE_SIXTHS,
  '⅛': FRACTION_EIGHTH,
  '⅜': FRACTION_THREE_EIGHTHS,
  '⅝': FRACTION_FIVE_EIGHTHS,
  '⅞': FRACTION_SEVEN_EIGHTHS,
};

/** Common unit normalizations */
const UNIT_NORMALIZATIONS: Record<string, string> = {
  tbsp: 'tablespoon',
  tablespoons: 'tablespoon',
  tbs: 'tablespoon',
  tsp: 'teaspoon',
  teaspoons: 'teaspoon',
  c: 'cup',
  cups: 'cup',
  oz: 'ounce',
  ounces: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  pounds: 'pound',
  g: 'gram',
  grams: 'gram',
  kg: 'kilogram',
  kilograms: 'kilogram',
  ml: 'milliliter',
  milliliters: 'milliliter',
  l: 'liter',
  liters: 'liter',
  pt: 'pint',
  pints: 'pint',
  qt: 'quart',
  quarts: 'quart',
  gal: 'gallon',
  gallons: 'gallon',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  piece: 'piece',
  pieces: 'piece',
  can: 'can',
  cans: 'can',
  package: 'package',
  packages: 'package',
  pkg: 'package',
  bunch: 'bunch',
  bunches: 'bunch',
  head: 'head',
  heads: 'head',
  sprig: 'sprig',
  sprigs: 'sprig',
  stick: 'stick',
  sticks: 'stick',
  large: 'large',
  medium: 'medium',
  small: 'small',
};

/** parseInt radix for decimal numbers */
const RADIX_DECIMAL = 10;

/** Regex capture group indices for numeric parsing */
const REGEX_GROUP_RANGE_LOW = 1;
const REGEX_GROUP_RANGE_HIGH = 2;
const REGEX_GROUP_MIXED_WHOLE = 3;
const REGEX_GROUP_MIXED_NUM = 4;
const REGEX_GROUP_MIXED_DENOM = 5;
const REGEX_GROUP_FRAC_NUM = 6;
const REGEX_GROUP_FRAC_DENOM = 7;
const REGEX_GROUP_SIMPLE = 8;

/** Divisor for calculating range average */
const RANGE_AVERAGE_DIVISOR = 2;

/** Tolerance for fraction matching in formatAmount */
const FRACTION_TOLERANCE = 0.01;

/** Common fractions for display formatting */
const DISPLAY_FRACTION_QUARTER = 0.25;
const DISPLAY_FRACTION_THIRD = 0.33;
const DISPLAY_FRACTION_HALF = 0.5;
const DISPLAY_FRACTION_TWO_THIRDS = 0.67;
const DISPLAY_FRACTION_THREE_QUARTERS = 0.75;

/** Result from trying to parse a unicode fraction */
interface FractionParseResult {
  amount: number;
  unitPart: string;
}

/**
 * Try to parse a unicode fraction at the start of a string.
 * @returns Parse result or null if no fraction found
 */
function tryParseLeadingFraction(trimmed: string): FractionParseResult | null {
  for (const [fraction, value] of Object.entries(FRACTION_MAP)) {
    if (trimmed.startsWith(fraction)) {
      const rest = trimmed.slice(fraction.length).trim();
      const wholeMatch = rest.match(/^(\d+)/);
      if (wholeMatch?.[REGEX_GROUP_RANGE_LOW]) {
        return {
          amount: parseInt(wholeMatch[REGEX_GROUP_RANGE_LOW], RADIX_DECIMAL) + value,
          unitPart: rest.slice(wholeMatch[REGEX_GROUP_RANGE_LOW].length).trim(),
        };
      }
      return { amount: value, unitPart: rest };
    }
  }
  return null;
}

/**
 * Try to parse "1½" pattern (number followed by unicode fraction).
 * @returns Parse result or null if pattern not matched
 */
function tryParseNumberWithFraction(trimmed: string): FractionParseResult | null {
  for (const [fraction, value] of Object.entries(FRACTION_MAP)) {
    const idx = trimmed.indexOf(fraction);
    if (idx > 0) {
      const beforeFraction = trimmed.slice(0, idx).trim();
      const numMatch = beforeFraction.match(/(\d+)$/);
      if (numMatch?.[REGEX_GROUP_RANGE_LOW]) {
        return {
          amount: parseInt(numMatch[REGEX_GROUP_RANGE_LOW], RADIX_DECIMAL) + value,
          unitPart: trimmed.slice(idx + fraction.length).trim(),
        };
      }
    }
  }
  return null;
}

/**
 * Try to parse standard numeric formats (ranges, fractions, decimals).
 * @returns Parse result or null if no match
 */
function tryParseNumericFormat(trimmed: string): FractionParseResult | null {
  const numericMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)|^(\d+)\s+(\d+)\/(\d+)|^(\d+)\/(\d+)|^(\d+(?:\.\d+)?)/,
  );

  if (!numericMatch) {
    return null;
  }

  const matchLength = numericMatch[0].length;
  const unitPart = trimmed.slice(matchLength).trim();

  // Range: "2-3" → average
  if (numericMatch[REGEX_GROUP_RANGE_LOW] && numericMatch[REGEX_GROUP_RANGE_HIGH]) {
    const low = parseFloat(numericMatch[REGEX_GROUP_RANGE_LOW]);
    const high = parseFloat(numericMatch[REGEX_GROUP_RANGE_HIGH]);
    return { amount: (low + high) / RANGE_AVERAGE_DIVISOR, unitPart };
  }

  // Mixed: "1 1/2"
  if (
    numericMatch[REGEX_GROUP_MIXED_WHOLE] &&
    numericMatch[REGEX_GROUP_MIXED_NUM] &&
    numericMatch[REGEX_GROUP_MIXED_DENOM]
  ) {
    const whole = parseInt(numericMatch[REGEX_GROUP_MIXED_WHOLE], RADIX_DECIMAL);
    const num = parseInt(numericMatch[REGEX_GROUP_MIXED_NUM], RADIX_DECIMAL);
    const denom = parseInt(numericMatch[REGEX_GROUP_MIXED_DENOM], RADIX_DECIMAL);
    return { amount: whole + num / denom, unitPart };
  }

  // Fraction: "1/2"
  if (numericMatch[REGEX_GROUP_FRAC_NUM] && numericMatch[REGEX_GROUP_FRAC_DENOM]) {
    const num = parseInt(numericMatch[REGEX_GROUP_FRAC_NUM], RADIX_DECIMAL);
    const denom = parseInt(numericMatch[REGEX_GROUP_FRAC_DENOM], RADIX_DECIMAL);
    return { amount: num / denom, unitPart };
  }

  // Simple number
  if (numericMatch[REGEX_GROUP_SIMPLE]) {
    return { amount: parseFloat(numericMatch[REGEX_GROUP_SIMPLE]), unitPart };
  }

  return null;
}

/**
 * Parse a quantity string into amount and unit.
 *
 * Examples:
 *   "2 cups" → { amount: 2, unit: "cup" }
 *   "1/2 tsp" → { amount: 0.5, unit: "teaspoon" }
 *   "½ lb" → { amount: 0.5, unit: "pound" }
 *   "2-3" → { amount: 2.5, unit: "" }
 *
 * @param quantity - Quantity string to parse
 * @returns Parsed quantity or null if unparseable
 */
export function parseQuantity(quantity: string): ParsedQuantity | null {
  if (!quantity || quantity.trim() === '') {
    return null;
  }

  const trimmed = quantity.trim();

  // Try different parsing strategies in order
  const result =
    tryParseLeadingFraction(trimmed) ??
    tryParseNumberWithFraction(trimmed) ??
    tryParseNumericFormat(trimmed);

  if (!result) {
    return null;
  }

  return { amount: result.amount, unit: normalizeUnit(result.unitPart) };
}

/**
 * Normalize a unit string to a standard form.
 *
 * @param unit - Unit string to normalize
 * @returns Normalized unit
 */
export function normalizeUnit(unit: string): string {
  if (!unit) {
    return '';
  }
  const lower = unit.toLowerCase().trim();
  return UNIT_NORMALIZATIONS[lower] ?? lower;
}

/**
 * Normalize an ingredient name for deduplication.
 *
 * Removes extra whitespace, converts to lowercase, and strips
 * common descriptors like "fresh", "chopped", etc.
 *
 * @param name - Ingredient name to normalize
 * @returns Normalized name
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove common descriptors
  const descriptors = [
    'fresh',
    'dried',
    'frozen',
    'canned',
    'chopped',
    'diced',
    'minced',
    'sliced',
    'grated',
    'shredded',
    'crushed',
    'ground',
    'whole',
    'halved',
    'quartered',
    'peeled',
    'seeded',
    'pitted',
    'boneless',
    'skinless',
    'organic',
    'raw',
    'cooked',
    'softened',
    'melted',
    'room temperature',
    'cold',
    'hot',
    'warm',
    'packed',
    'loosely packed',
    'firmly packed',
    'lightly packed',
    'finely',
    'coarsely',
    'roughly',
    'thinly',
    'thickly',
  ];

  for (const desc of descriptors) {
    // Match word boundaries to avoid partial replacements
    const regex = new RegExp(`\\b${desc}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing commas and conjunctions
  normalized = normalized.replace(/^[,\s]+|[,\s]+$/g, '');

  return normalized;
}

/**
 * Generate a unique ID for an ingredient based on its normalized name.
 *
 * @param name - Ingredient name
 * @returns Unique ID string
 */
export function generateIngredientId(name: string): string {
  const normalized = normalizeIngredientName(name);
  // Simple slug-like ID
  return normalized
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Combine quantities with matching units into a single display string.
 *
 * @param quantities - Array of quantities to combine
 * @returns Combined display string
 */
export function combineQuantities(quantities: QuantitySource[]): string {
  if (quantities.length === 0) {
    return '';
  }

  // Group by unit
  const byUnit = new Map<string, number>();
  const unparsed: string[] = [];

  for (const q of quantities) {
    if (q.amount === null) {
      // Can't combine, just note the recipe
      unparsed.push(q.recipeSlug);
      continue;
    }

    const unit = normalizeUnit(q.unit);
    const current = byUnit.get(unit) ?? 0;
    byUnit.set(unit, current + q.amount);
  }

  // Build display string
  const parts: string[] = [];

  for (const [unit, amount] of byUnit) {
    const displayAmount = formatAmount(amount);
    if (unit) {
      parts.push(`${displayAmount} ${unit}${amount !== 1 ? 's' : ''}`);
    } else {
      parts.push(displayAmount);
    }
  }

  if (unparsed.length > 0) {
    parts.push(`(from ${unparsed.join(', ')})`);
  }

  return parts.join(' + ');
}

/**
 * Format a numeric amount for display.
 *
 * Converts to fractions when appropriate.
 *
 * @param amount - Numeric amount
 * @returns Formatted string
 */
export function formatAmount(amount: number): string {
  // Handle whole numbers
  if (Number.isInteger(amount)) {
    return amount.toString();
  }

  // Check for common fractions
  const fractions: [number, string][] = [
    [DISPLAY_FRACTION_QUARTER, '¼'],
    [DISPLAY_FRACTION_THIRD, '⅓'],
    [DISPLAY_FRACTION_HALF, '½'],
    [DISPLAY_FRACTION_TWO_THIRDS, '⅔'],
    [DISPLAY_FRACTION_THREE_QUARTERS, '¾'],
  ];

  const whole = Math.floor(amount);
  const decimal = amount - whole;

  for (const [value, symbol] of fractions) {
    if (Math.abs(decimal - value) < FRACTION_TOLERANCE) {
      return whole > 0 ? `${whole}${symbol}` : symbol;
    }
  }

  // Fall back to decimal with max 1 decimal place
  return amount.toFixed(1).replace(/\.0$/, '');
}

/**
 * Parse and scale an ingredient's quantity.
 */
function parseAndScaleQuantity(
  ingredient: IIngredient,
  multiplier: number,
): { amount: number | null; unit: string } {
  if (ingredient.quantity) {
    const parsed = parseQuantity(ingredient.quantity);
    if (parsed) {
      return { amount: parsed.amount * multiplier, unit: parsed.unit };
    }
  }
  const unit = ingredient.unit ? normalizeUnit(ingredient.unit) : '';
  return { amount: null, unit };
}

/**
 * Add or update an ingredient in the aggregation map.
 */
function addToAggregation(
  aggregated: Map<string, AggregatedIngredient>,
  ingredient: IIngredient,
  quantitySource: QuantitySource,
): void {
  const normalizedName = normalizeIngredientName(ingredient.name);
  const existing = aggregated.get(normalizedName);

  if (existing) {
    existing.quantities.push(quantitySource);
    existing.displayQuantity = combineQuantities(existing.quantities);
    return;
  }

  const newItem: AggregatedIngredient = {
    id: generateIngredientId(ingredient.name),
    name: normalizedName,
    quantities: [quantitySource],
    displayQuantity: combineQuantities([quantitySource]),
    category: categorizeIngredient(normalizedName),
  };
  aggregated.set(normalizedName, newItem);
}

/**
 * Aggregate ingredients from multiple recipes into a deduplicated list.
 *
 * Combines quantities when units match, categorizes by grocery section,
 * and generates unique IDs for each aggregated ingredient.
 *
 * @param recipes - Array of recipes with ingredients and optional servings multiplier
 * @returns Array of aggregated ingredients
 */
export function aggregateIngredients(recipes: RecipeIngredients[]): AggregatedIngredient[] {
  const aggregated = new Map<string, AggregatedIngredient>();

  for (const recipe of recipes) {
    const multiplier = recipe.servingsMultiplier ?? 1;

    for (const ingredient of recipe.ingredients) {
      const { amount, unit } = parseAndScaleQuantity(ingredient, multiplier);
      const quantitySource: QuantitySource = { amount, unit, recipeSlug: recipe.slug };
      addToAggregation(aggregated, ingredient, quantitySource);
    }
  }

  return Array.from(aggregated.values());
}
