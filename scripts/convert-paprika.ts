#!/usr/bin/env npx tsx
/**
 * Paprika HTML to Cooklang Converter
 *
 * Converts exported Paprika HTML recipes to Cooklang (.cook) format.
 *
 * Usage:
 *   npx tsx scripts/convert-paprika.ts [--dry-run]
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const SOURCE_DIR = 'exported-pap-recipes/85 recipes/Recipes';
const RECIPES_DIR = 'recipes';

// TIME_UNIT_TO_MINUTES is available for future time normalization features
const _TIME_UNIT_TO_MINUTES: Record<string, number> = {
  minute: 1,
  minutes: 1,
  min: 1,
  mins: 1,
  m: 1,
  hour: 60,
  hours: 60,
  hr: 60,
  hrs: 60,
  h: 60,
};

const UNIT_ALIASES: Record<string, string> = {
  tablespoons: 'tbsp',
  tablespoon: 'tbsp',
  teaspoons: 'tsp',
  teaspoon: 'tsp',
  ounces: 'oz',
  ounce: 'oz',
  pounds: 'lb',
  pound: 'lb',
  cups: 'cups',
  cup: 'cup',
};

/**
 * Maps Paprika category keywords to meal types.
 * Order matters - first match wins.
 */
const MEAL_TYPE_KEYWORDS: Record<string, string[]> = {
  desserts: ['dessert', 'cookie', 'cake', 'frosting', 'icing'],
  sides: ['side dish', 'side'],
  soups: ['soup', 'stew', 'chili'],
  breakfast: ['breakfast'],
  salads: ['salad'],
  // entrees is the default fallback
};

interface ParsedIngredient {
  quantity: string | null;
  unit: string | null;
  name: string;
  coreName: string; // Simplified name for step matching
  originalText: string;
}

interface ParsedRecipe {
  title: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: string | null;
  source: string | null;
  category: string | null;
  ingredients: ParsedIngredient[];
  directions: string[];
  notes: string[];
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#189;': '½',
    '&#188;': '¼',
    '&#190;': '¾',
    '&#8531;': '⅓',
    '&#8532;': '⅔',
    '&#8539;': '⅛',
    '&#8540;': '¼',
    '&#8541;': '⅜',
    '&#8542;': '½',
    '&#8543;': '⅝',
    '&#8260;': '/',
    '℉': '°F',
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char);
  }
  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)));
  return result;
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, '')).trim();
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseTimeString(timeStr: string): number | null {
  if (!timeStr) {
    return null;
  }
  const cleaned = timeStr.toLowerCase().trim();
  let totalMinutes = 0;

  // Match patterns like "1 hr 10 mins", "15 mins", "4 hrs"
  const hourMatch = cleaned.match(/(\d+)\s*(hours?|hrs?|h)\b/);
  const minMatch = cleaned.match(/(\d+)\s*(minutes?|mins?|m)\b/);

  if (hourMatch) {
    totalMinutes += Number.parseInt(hourMatch[1], 10) * 60;
  }
  if (minMatch) {
    totalMinutes += Number.parseInt(minMatch[1], 10);
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

function parseServings(servingsStr: string): string | null {
  if (!servingsStr) {
    return null;
  }
  // Extract just the number from strings like "Servings: 8 servings"
  const match = servingsStr.match(/(\d+)/);
  return match ? match[1] : null;
}

function fractionToDecimal(fraction: string): number {
  const unicodeFractions: Record<string, number> = {
    '½': 0.5,
    '⅓': 0.333,
    '⅔': 0.667,
    '¼': 0.25,
    '¾': 0.75,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 0.167,
    '⅚': 0.833,
  };

  // Handle unicode fractions
  for (const [uf, val] of Object.entries(unicodeFractions)) {
    if (fraction.includes(uf)) {
      const prefix = fraction.replace(uf, '').trim();
      const prefixNum = prefix ? Number.parseFloat(prefix) : 0;
      return prefixNum + val;
    }
  }

  // Handle "1/2" style fractions
  if (fraction.includes('/')) {
    const parts = fraction.split('/');
    if (parts.length === 2) {
      const num = Number.parseFloat(parts[0]);
      const den = Number.parseFloat(parts[1]);
      if (!(Number.isNaN(num) || Number.isNaN(den)) && den !== 0) {
        return num / den;
      }
    }
  }

  const parsed = Number.parseFloat(fraction);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseQuantity(qtyStr: string): string | null {
  if (!qtyStr) {
    return null;
  }
  const cleaned = qtyStr.trim();
  if (!cleaned) {
    return null;
  }

  // Check for range like "2 ½ - 3" - return null to keep as string
  if (cleaned.includes('-') && /\d/.test(cleaned)) {
    // This is a range, return the original cleaned string
    return cleaned;
  }

  // Try to parse as a number
  const num = fractionToDecimal(cleaned);
  if (num > 0) {
    // Return clean number, avoiding floating point issues
    const rounded = Math.round(num * 1000) / 1000;
    return String(rounded);
  }

  return cleaned;
}

const UNIT_PATTERN =
  /^(lbs?|lb|oz|ounces?|cups?|tbsp|tablespoons?|tsp|teaspoons?|cloves?|cans?|large|medium|small|whole|pinch|dash|bunch|head|stalk|slices?|pieces?|packages?)\b/i;

/**
 * Extracts unit from the beginning of text and returns the normalized unit and remaining text.
 */
function extractUnit(text: string): { unit: string | null; remaining: string } {
  const unitMatch = text.match(UNIT_PATTERN);
  if (!unitMatch) {
    return { unit: null, remaining: text };
  }
  let unit = unitMatch[1].toLowerCase();
  if (UNIT_ALIASES[unit]) {
    unit = UNIT_ALIASES[unit];
  }
  return { unit, remaining: text.slice(unitMatch[0].length).trim() };
}

/**
 * Parses quantity from the start of ingredient text (no <strong> tag case).
 */
function parseQuantityFromText(text: string): { quantity: string | null; remaining: string } {
  // Check for mixed numbers first (e.g., "3 1/2")
  const mixedMatch = text.match(/^(\d+)\s+(\d+\s*\/\s*\d+)\s+/);
  if (mixedMatch) {
    const whole = Number.parseInt(mixedMatch[1], 10);
    const frac = fractionToDecimal(mixedMatch[2]);
    const quantity = String(Math.round((whole + frac) * 1000) / 1000);
    return { quantity, remaining: text.slice(mixedMatch[0].length).trim() };
  }

  // Check for simple fractions and unicode fractions
  const qtyMatch = text.match(/^(\d+(?:\s*\/\s*\d+)?(?:\s*[½⅓⅔¼¾⅛⅜⅝⅞])?|\d*\s*[½⅓⅔¼¾⅛⅜⅝⅞])\s*/);
  if (qtyMatch) {
    const quantity = parseQuantity(qtyMatch[1]);
    return { quantity, remaining: text.slice(qtyMatch[0].length).trim() };
  }

  return { quantity: null, remaining: text };
}

/**
 * Handles parenthetical notes at the start of ingredient text like "(15 ounce) can".
 */
function handleParentheticalNotes(
  text: string,
  existingUnit: string | null,
): { unit: string | null; remaining: string } {
  const parenMatch = text.match(/^\(([^)]+)\)\s*/);
  if (!parenMatch) {
    return { unit: existingUnit, remaining: text };
  }

  const remaining = `${parenMatch[1]} ${text.slice(parenMatch[0].length)}`.trim();
  if (existingUnit) {
    return { unit: existingUnit, remaining };
  }

  // Try to extract unit from the expanded text
  return extractUnit(remaining);
}

/**
 * Extract the core ingredient name by:
 * 1. Removing parenthetical notes like "(about 1 pound)"
 * 2. Removing trailing descriptions after commas
 * 3. Stripping descriptive adjectives like "minced", "diced", etc.
 */
function extractCoreName(name: string): string {
  let core = name;

  // Remove parenthetical notes
  core = core.replace(/\s*\([^)]*\)/g, '');

  // Remove text after comma (often notes like "softened", "diced")
  const commaIdx = core.indexOf(',');
  if (commaIdx > 0) {
    core = core.slice(0, commaIdx);
  }

  // Common descriptive words to strip
  const descriptors = [
    'minced',
    'diced',
    'chopped',
    'sliced',
    'shredded',
    'grated',
    'crushed',
    'ground',
    'dried',
    'fresh',
    'frozen',
    'canned',
    'cooked',
    'raw',
    'softened',
    'melted',
    'room temperature',
    'cold',
    'warm',
    'hot',
    'undrained',
    'drained',
    'rinsed',
    'trimmed',
    'boneless',
    'skinless',
    'bone-in',
    'skin-on',
    'quartered',
    'halved',
  ];

  for (const desc of descriptors) {
    // Match at start or after space
    const regex = new RegExp(`\\b${desc}\\b\\s*`, 'gi');
    core = core.replace(regex, '');
  }

  return core.trim();
}

function parseIngredientLine(html: string): ParsedIngredient {
  let text = normalizeWhitespace(stripHtml(html));
  text = text.replace(/^[-•*]\s*/, ''); // Remove leading bullet points or dashes

  // Extract quantity - either from <strong> tags or from text
  const strongMatch = html.match(/<strong>([^<]+)<\/strong>/);
  let quantity: string | null = null;
  let remaining = text;

  if (strongMatch) {
    quantity = parseQuantity(strongMatch[1]);
    remaining = text.replace(strongMatch[1], '').trim();
  } else {
    const qtyResult = parseQuantityFromText(text);
    quantity = qtyResult.quantity;
    remaining = qtyResult.remaining;
  }

  // Extract unit and handle parenthetical notes
  const unitResult = extractUnit(remaining);
  const parenResult = handleParentheticalNotes(unitResult.remaining, unitResult.unit);

  // Clean up the ingredient name
  let name = parenResult.remaining;
  name = name.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
  name = name.replace(/\s+/g, ' ');

  return {
    quantity,
    unit: parenResult.unit,
    name,
    coreName: extractCoreName(name),
    originalText: text,
  };
}

/**
 * Detects meal type category from Paprika's recipeCategory field and recipe content.
 * Uses the HTML category first, then falls back to keyword detection.
 */
function detectMealType(recipe: ParsedRecipe): string {
  // Combine Paprika category with title for searching
  const searchText = `${recipe.category || ''} ${recipe.title}`.toLowerCase();

  for (const [mealType, keywords] of Object.entries(MEAL_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return mealType;
      }
    }
  }

  // Default to entrees for main dishes (chicken, beef, pasta, fish, etc.)
  return 'entrees';
}

/**
 * Extracts directions from HTML, handling <br> tags as step separators.
 */
function extractDirections(container: Element | null): string[] {
  if (!container) {
    return [];
  }
  const directions: string[] = [];
  const stepEls = container.querySelectorAll('p.line');

  for (const el of stepEls) {
    const htmlContent = el.innerHTML;
    const parts = htmlContent.includes('<br') ? htmlContent.split(/<br\s*\/?>/i) : [htmlContent];

    for (const part of parts) {
      const stepText = normalizeWhitespace(stripHtml(part));
      if (stepText) {
        directions.push(stepText);
      }
    }
  }
  return directions;
}

/**
 * Extracts notes from HTML comment container.
 */
function extractNotes(container: Element | null): string[] {
  if (!container) {
    return [];
  }
  const notes: string[] = [];
  const noteEls = container.querySelectorAll('p');

  for (const el of noteEls) {
    const noteText = normalizeWhitespace(stripHtml(el.innerHTML));
    if (noteText) {
      notes.push(noteText);
    }
  }
  return notes;
}

/**
 * Extracts recipe metadata (title, times, servings, source, category) from document.
 */
function extractRecipeMetadata(doc: Document): {
  title: string;
  prepTime: number | null;
  cookTime: number | null;
  servings: string | null;
  source: string | null;
  category: string | null;
} {
  const titleEl = doc.querySelector('h1[itemprop="name"]');
  const prepTimeEl = doc.querySelector('span[itemprop="prepTime"]');
  const cookTimeEl = doc.querySelector('span[itemprop="cookTime"]');
  const servingsEl = doc.querySelector('span[itemprop="recipeYield"]');
  const sourceEl = doc.querySelector('a[itemprop="url"]');
  const categoryEl = doc.querySelector('p[itemprop="recipeCategory"]');

  return {
    title: titleEl ? normalizeWhitespace(stripHtml(titleEl.innerHTML)) : 'Untitled',
    prepTime: prepTimeEl ? parseTimeString(prepTimeEl.textContent || '') : null,
    cookTime: cookTimeEl ? parseTimeString(cookTimeEl.textContent || '') : null,
    servings: servingsEl ? parseServings(servingsEl.textContent || '') : null,
    source: sourceEl ? sourceEl.getAttribute('href') : null,
    category: categoryEl ? normalizeWhitespace(stripHtml(categoryEl.innerHTML)) : null,
  };
}

function parseHtmlRecipe(html: string): ParsedRecipe {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const metadata = extractRecipeMetadata(doc);

  // Extract ingredients
  const ingredientEls = doc.querySelectorAll('p.line[itemprop="recipeIngredient"]');
  const ingredients: ParsedIngredient[] = [];
  for (const el of ingredientEls) {
    ingredients.push(parseIngredientLine(el.innerHTML));
  }

  return {
    ...metadata,
    ingredients,
    directions: extractDirections(doc.querySelector('div[itemprop="recipeInstructions"]')),
    notes: extractNotes(doc.querySelector('div[itemprop="comment"]')),
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatIngredientRef(ing: ParsedIngredient): string {
  // Use coreName for cleaner output - it strips parenthetical notes and trailing commas
  const name = ing.coreName || ing.name;
  const hasMultipleWords = name.includes(' ');

  if (ing.quantity && ing.unit) {
    return `@${name}{${ing.quantity}%${ing.unit}}`;
  }

  if (ing.quantity) {
    return `@${name}{${ing.quantity}}`;
  }

  if (hasMultipleWords) {
    return `@${name}{}`;
  }

  return `@${name}`;
}

interface SearchEntry {
  pattern: string;
  ingredient: ParsedIngredient;
}

const MIN_WORD_LENGTH_FOR_PARTIAL_MATCH = 4;

/**
 * Builds search patterns for ingredient matching in recipe steps.
 * Returns patterns sorted by length (longest first) to avoid partial matches.
 */
function buildSearchPatterns(ingredients: ParsedIngredient[]): SearchEntry[] {
  const patterns: SearchEntry[] = [];

  for (const ing of ingredients) {
    // Add full name
    patterns.push({ pattern: ing.name, ingredient: ing });

    // Add core name if different
    if (ing.coreName && ing.coreName !== ing.name) {
      patterns.push({ pattern: ing.coreName, ingredient: ing });
    }

    // For multi-word core names, try the last 1-2 words
    const coreWords = ing.coreName.split(' ');
    if (coreWords.length >= 2) {
      const lastWord = coreWords[coreWords.length - 1];
      if (lastWord.length >= MIN_WORD_LENGTH_FOR_PARTIAL_MATCH) {
        patterns.push({ pattern: lastWord, ingredient: ing });
      }
      const lastTwo = coreWords.slice(-2).join(' ');
      if (lastTwo !== ing.coreName) {
        patterns.push({ pattern: lastTwo, ingredient: ing });
      }
    }
  }

  return patterns.sort((a, b) => b.pattern.length - a.pattern.length);
}

function processStepWithIngredients(step: string, ingredients: ParsedIngredient[]): string {
  let result = step;
  const usedIngredients = new Set<string>();
  const searchPatterns = buildSearchPatterns(ingredients);

  for (const { pattern, ingredient: ing } of searchPatterns) {
    if (usedIngredients.has(ing.name)) {
      continue;
    }

    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i');
    if (regex.test(result)) {
      result = result.replace(regex, formatIngredientRef(ing));
      usedIngredients.add(ing.name);
    }
  }

  return result;
}

function generateCooklang(recipe: ParsedRecipe): string {
  const lines: string[] = [];

  // Metadata
  lines.push(`>> title: ${recipe.title}`);
  if (recipe.servings) {
    lines.push(`>> servings: ${recipe.servings}`);
  }
  if (recipe.prepTime) {
    lines.push(`>> prep time: ${recipe.prepTime} minutes`);
  }
  if (recipe.cookTime) {
    lines.push(`>> cook time: ${recipe.cookTime} minutes`);
  }
  if (recipe.source) {
    lines.push(`>> source: ${recipe.source}`);
  }

  // Blank line before steps
  lines.push('');

  // Process directions with inline ingredient markers
  for (const step of recipe.directions) {
    const processedStep = processStepWithIngredients(step, recipe.ingredients);
    lines.push(processedStep);
    lines.push('');
  }

  // Add notes as comments
  if (recipe.notes.length > 0) {
    for (const note of recipe.notes) {
      lines.push(`-- ${note}`);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface ConversionResults {
  success: number;
  failed: number;
  byCategory: Record<string, number>;
}

const SUMMARY_LINE_LENGTH = 50;

/**
 * Prints the conversion summary to the console.
 */
function printSummary(
  results: ConversionResults,
  totalFiles: number,
  errors: string[],
  isDryRun: boolean,
): void {
  console.log(`\n${'='.repeat(SUMMARY_LINE_LENGTH)}`);
  console.log('SUMMARY');
  console.log('='.repeat(SUMMARY_LINE_LENGTH));
  console.log(`Total files: ${totalFiles}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nBy category:');

  for (const [cat, count] of Object.entries(results.byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }

  if (isDryRun) {
    console.log('\n[DRY RUN - no files were written]');
  }
}

/**
 * Converts a single HTML file to Cooklang format.
 */
function convertHtmlFile(
  htmlFile: string,
  isDryRun: boolean,
): { recipe: ParsedRecipe; category: string; slug: string } {
  const htmlPath = join(SOURCE_DIR, htmlFile);
  const html = readFileSync(htmlPath, 'utf-8');
  const recipe = parseHtmlRecipe(html);

  const category = detectMealType(recipe);

  const slug = slugify(recipe.title);
  const categoryDir = join(RECIPES_DIR, category);
  const outputPath = join(categoryDir, `${slug}.cook`);
  const cooklang = generateCooklang(recipe);

  if (!isDryRun) {
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }
    writeFileSync(outputPath, cooklang, 'utf-8');
  }

  return { recipe, category, slug };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`Paprika HTML to Cooklang Converter`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  const htmlFiles = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.html'));
  console.log(`Found ${htmlFiles.length} HTML files to convert\n`);

  const results: ConversionResults = { success: 0, failed: 0, byCategory: {} };
  const errors: string[] = [];

  // Meal type directories will be created as needed during conversion

  for (const htmlFile of htmlFiles) {
    try {
      const { recipe, category, slug } = convertHtmlFile(htmlFile, isDryRun);
      console.log(`✓ ${recipe.title} → ${category}/${slug}.cook`);
      results.success++;
      results.byCategory[category] = (results.byCategory[category] || 0) + 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${htmlFile}: ${message}`);
      errors.push(`${htmlFile}: ${message}`);
      results.failed++;
    }
  }

  printSummary(results, htmlFiles.length, errors, isDryRun);
}

main().catch(console.error);
