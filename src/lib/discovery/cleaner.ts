/** Ingredient cleaning helpers for TheMealDB discovery pipeline. */

import {
  type CleanedIngredient,
  type CleanedMeal,
  INGREDIENT_SLOT_INDICES,
  type TheMealDBMeal,
} from '@/lib/discovery/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('discovery');

const QUARTER_VALUE = 0.25;
const HALF_VALUE = 0.5;
const THREE_QUARTER_VALUE = 0.75;
const DECIMAL_PLACES = 2;
const REGEX_GROUP_2 = 2;
const REGEX_GROUP_3 = 3;
const REGEX_GROUP_4 = 4;

const PREP_PATTERNS =
  /^(finely |roughly )?(chopped|diced|minced|sliced|crushed|grated|peeled|melted|softened|dried|fresh|frozen|shredded|ground|torn|cubed|halved|quartered|trimmed|deseeded|cored)\s+/i;

const SPELLING_FIXES: Record<string, string> = {
  Challots: 'Shallots',
  Parsely: 'Parsley',
  Brocoli: 'Broccoli',
  Potatos: 'Potatoes',
  Tomatoe: 'Tomato',
  Tobasco: 'Tabasco',
  Clamato: 'Clamato',
  Granulated: 'Granulated',
};

const UNIT_ALIASES: Record<string, string> = {
  tbs: 'tbsp',
  tbsp: 'tbsp',
  tsp: 'tsp',
  oz: 'oz',
  ounce: 'oz',
  g: 'g',
  gram: 'g',
  ml: 'ml',
  cup: 'cup',
  cups: 'cup',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  kg: 'kg',
  kilogram: 'kg',
};

const NAMED_QUANTITIES = ['pinch', 'handful', 'splash', 'dash', 'to taste'];

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': QUARTER_VALUE,
  '½': HALF_VALUE,
  '¾': THREE_QUARTER_VALUE,
};

type ParsedMeasure = { quantity: string; unit: string };

function toDecimalString(value: number): string {
  return value
    .toFixed(DECIMAL_PLACES)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');
}

function normalizeUnit(unit: string): string {
  const lowerUnit = unit.toLowerCase().trim();
  return UNIT_ALIASES[lowerUnit] ?? lowerUnit;
}

function isPrepText(value: string): boolean {
  return PREP_PATTERNS.test(`${value.trim()} `);
}

export function separatePrep(ingredientName: string): { name: string; prep?: string } {
  const trimmed = ingredientName.trim();
  if (!trimmed) {
    return { name: '' };
  }

  let name = trimmed;
  let prep: string | undefined;

  const leadingMatch = name.match(PREP_PATTERNS);
  if (leadingMatch?.[0]) {
    prep = leadingMatch[0].trim();
    name = name.slice(leadingMatch[0].length).trim();
  }

  const trailingParenMatch = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (
    trailingParenMatch?.[1] &&
    trailingParenMatch[REGEX_GROUP_2] &&
    isPrepText(trailingParenMatch[REGEX_GROUP_2])
  ) {
    name = trailingParenMatch[1].trim();
    prep = prep
      ? `${prep}, ${trailingParenMatch[REGEX_GROUP_2].trim()}`
      : trailingParenMatch[REGEX_GROUP_2].trim();
  }

  return prep ? { name, prep } : { name };
}

function parseMixedUnicode(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+)\s*([¼½¾])\s*(.*)$/);
  if (!(match?.[1] && match[REGEX_GROUP_2])) {
    return null;
  }

  const whole = Number.parseFloat(match[1]);
  const fraction = UNICODE_FRACTIONS[match[REGEX_GROUP_2]];
  if (Number.isNaN(whole) || fraction === undefined) {
    return null;
  }

  return {
    quantity: toDecimalString(whole + fraction),
    unit: match[REGEX_GROUP_3]?.trim() ?? '',
  };
}

function parseUnicodeFraction(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^([¼½¾])\s*(.*)$/);
  if (!match?.[1]) {
    return null;
  }

  const fraction = UNICODE_FRACTIONS[match[1]];
  if (fraction === undefined) {
    return null;
  }

  return {
    quantity: toDecimalString(fraction),
    unit: match[REGEX_GROUP_2]?.trim() ?? '',
  };
}

function parseMixedFraction(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (!(match?.[1] && match[REGEX_GROUP_2] && match[REGEX_GROUP_3])) {
    return null;
  }

  const whole = Number.parseFloat(match[1]);
  const numerator = Number.parseFloat(match[REGEX_GROUP_2]);
  const denominator = Number.parseFloat(match[REGEX_GROUP_3]);

  if (
    Number.isNaN(whole) ||
    Number.isNaN(numerator) ||
    Number.isNaN(denominator) ||
    denominator === 0
  ) {
    return null;
  }

  return {
    quantity: toDecimalString(whole + numerator / denominator),
    unit: match[REGEX_GROUP_4]?.trim() ?? '',
  };
}

function parseSimpleFraction(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (!(match?.[1] && match[REGEX_GROUP_2])) {
    return null;
  }

  const numerator = Number.parseFloat(match[1]);
  const denominator = Number.parseFloat(match[REGEX_GROUP_2]);
  if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0) {
    return null;
  }

  return {
    quantity: toDecimalString(numerator / denominator),
    unit: match[REGEX_GROUP_3]?.trim() ?? '',
  };
}

function parseDecimalWithUnit(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!(match?.[1] && match[REGEX_GROUP_2])) {
    return null;
  }

  return {
    quantity: match[1],
    unit: match[REGEX_GROUP_2].trim(),
  };
}

function parseJammedUnit(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
  if (!(match?.[1] && match[REGEX_GROUP_2])) {
    return null;
  }

  return {
    quantity: match[1],
    unit: match[REGEX_GROUP_2].trim(),
  };
}

function parseBareNumber(trimmed: string): ParsedMeasure | null {
  const match = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (!match?.[1]) {
    return null;
  }

  return {
    quantity: match[1],
    unit: '',
  };
}

function parseNamedQuantity(trimmed: string): ParsedMeasure | null {
  const lowerTrimmed = trimmed.toLowerCase();
  if (!NAMED_QUANTITIES.includes(lowerTrimmed)) {
    return null;
  }

  return {
    quantity: '',
    unit: lowerTrimmed,
  };
}

export function parseMeasure(measure: string): { quantity: string; unit: string } {
  const trimmed = measure.trim();

  if (!trimmed) {
    return { quantity: '', unit: '' };
  }

  const parsers = [
    parseMixedUnicode,
    parseUnicodeFraction,
    parseMixedFraction,
    parseSimpleFraction,
    parseDecimalWithUnit,
    parseJammedUnit,
    parseBareNumber,
    parseNamedQuantity,
  ];

  for (const parser of parsers) {
    const parsed = parser(trimmed);
    if (parsed) {
      return parsed;
    }
  }

  return { quantity: '', unit: trimmed };
}

export function applySpellingFix(name: string): string {
  let fixed = name;

  for (const [wrong, corrected] of Object.entries(SPELLING_FIXES)) {
    const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    fixed = fixed.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), corrected);
  }

  return fixed;
}

export function cleanIngredient(rawName: string, rawMeasure: string): CleanedIngredient {
  const trimmedName = rawName.trim();
  const trimmedMeasure = rawMeasure.trim();
  const fixedName = applySpellingFix(trimmedName);
  const separated = separatePrep(fixedName);
  const parsed = parseMeasure(trimmedMeasure);

  const ingredient: CleanedIngredient = {
    name: separated.name.trim(),
    quantity: parsed.quantity,
    unit: normalizeUnit(parsed.unit),
    originalName: trimmedName,
    originalMeasure: trimmedMeasure,
  };

  if (separated.prep) {
    ingredient.prep = separated.prep;
  }

  return ingredient;
}

export function cleanMeal(raw: TheMealDBMeal): CleanedMeal {
  const ingredients: CleanedIngredient[] = [];

  for (const index of INGREDIENT_SLOT_INDICES) {
    const ingredientKey = `strIngredient${index}` as keyof TheMealDBMeal;
    const measureKey = `strMeasure${index}` as keyof TheMealDBMeal;

    const rawIngredient = raw[ingredientKey];
    const rawMeasure = raw[measureKey];
    const ingredientText = typeof rawIngredient === 'string' ? rawIngredient.trim() : '';
    const measureText = typeof rawMeasure === 'string' ? rawMeasure.trim() : '';

    if (!ingredientText) {
      if (measureText) {
        log.debug('Skipping orphaned measure without ingredient', {
          mealId: raw.idMeal,
          slot: index,
          measure: measureText,
        });
      }
      continue;
    }

    ingredients.push(cleanIngredient(ingredientText, measureText));
  }

  return {
    externalId: raw.idMeal,
    title: raw.strMeal,
    category: raw.strCategory,
    cuisine: raw.strArea,
    instructions: raw.strInstructions,
    imageUrl: raw.strMealThumb,
    sourceUrl: raw.strSource,
    tags: raw.strTags,
    ingredients,
    rawData: raw,
  };
}
