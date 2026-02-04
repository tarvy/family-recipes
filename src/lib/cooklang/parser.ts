/**
 * Cooklang parser - converts .cook files to IRecipe
 *
 * Uses the official @cooklang/cooklang-ts library for parsing.
 *
 * Usage:
 *   import { parseCooklang } from '@/lib/cooklang';
 *
 *   const result = parseCooklang(source, {
 *     filePath: 'recipes/tacos.cook',
 *     gitCommitHash: 'abc123',
 *   });
 */

import {
  Recipe as CooklangRecipe,
  type Cookware,
  type Ingredient,
  type Step,
} from '@cooklang/cooklang-ts';
import type { ICookware, IIngredient, IRecipe, IStep } from '@/db/types';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';
import { DECIMAL_RADIX, METADATA_KEYS, normalizeMetadataKey, parseTimeString } from './constants';

export interface ParseContext {
  /** Path to the .cook file relative to recipes directory */
  filePath: string;
  /** Git commit hash at time of parsing */
  gitCommitHash: string;
}

export interface ParseResult {
  success: true;
  recipe: IRecipe;
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParseOutput = ParseResult | ParseError;

/**
 * Generate a URL-safe slug from a filename or title
 *
 * Uses the same logic as generateSlugFromTitle in metadata.ts to ensure
 * consistent slugs between parsing and API operations.
 */
function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.cook$/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract title from file path (filename without extension)
 */
function titleFromFilePath(filePath: string): string {
  const filename = filePath.split('/').pop() ?? filePath;
  return filename.replace(/\.cook$/, '').replace(/-/g, ' ');
}

/**
 * Parse servings from metadata (handles "4" or "4 servings")
 */
function parseServings(value: string): number | undefined {
  const match = value.match(/^(\d+)/);
  return match?.[1] ? parseInt(match[1], DECIMAL_RADIX) : undefined;
}

/**
 * Parse comma-separated tags
 */
function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Convert cooklang-ts Ingredient to IIngredient
 */
function convertIngredient(ing: Ingredient): IIngredient {
  const result: IIngredient = { name: ing.name };

  if (ing.quantity !== undefined && ing.quantity !== '') {
    result.quantity = String(ing.quantity);
  }

  if (ing.units) {
    result.unit = ing.units;
  }

  return result;
}

/**
 * Convert cooklang-ts Cookware to ICookware
 */
function convertCookware(cw: Cookware): ICookware {
  const result: ICookware = { name: cw.name };

  if (cw.quantity !== undefined && cw.quantity !== '' && cw.quantity !== 1) {
    result.quantity =
      typeof cw.quantity === 'number' ? cw.quantity : parseInt(String(cw.quantity), DECIMAL_RADIX);
  }

  return result;
}

/**
 * Convert a cooklang step (array of tokens) to IStep
 */
function convertStep(step: Step): IStep {
  const textParts: string[] = [];
  const ingredients: IIngredient[] = [];
  const cookware: ICookware[] = [];
  const timers: { duration: number; unit: string }[] = [];

  for (const token of step) {
    switch (token.type) {
      case 'text':
        textParts.push(token.value);
        break;
      case 'ingredient':
        textParts.push(token.name);
        ingredients.push(convertIngredient(token));
        break;
      case 'cookware':
        textParts.push(token.name);
        cookware.push(convertCookware(token));
        break;
      case 'timer':
        {
          const unit = token.units || 'minutes';
          const duration =
            typeof token.quantity === 'number'
              ? token.quantity
              : parseFloat(String(token.quantity)) || 0;
          textParts.push(`${duration} ${unit}`);
          timers.push({ duration, unit });
        }
        break;
    }
  }

  const result: IStep = {
    text: textParts.join('').trim(),
  };

  if (ingredients.length > 0) {
    result.ingredients = ingredients;
  }
  if (cookware.length > 0) {
    result.cookware = cookware;
  }
  if (timers.length > 0) {
    result.timers = timers;
  }

  return result;
}

/**
 * Deduplicate ingredients by name, combining quantities if possible
 */
function deduplicateIngredients(ingredients: IIngredient[]): IIngredient[] {
  const seen = new Map<string, IIngredient>();

  for (const ing of ingredients) {
    const key = ing.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...ing });
    }
  }

  return Array.from(seen.values());
}

/**
 * Deduplicate cookware by name
 */
function deduplicateCookware(cookware: ICookware[]): ICookware[] {
  const seen = new Map<string, ICookware>();

  for (const cw of cookware) {
    const key = cw.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { ...cw });
    }
  }

  return Array.from(seen.values());
}

type Metadata = Record<string, string>;

/**
 * Normalize metadata keys to handle aliases
 *
 * Transforms raw metadata from cooklang-ts by normalizing keys:
 * - 'serves' → 'servings'
 * - 'time' → 'total time'
 * - 'introduction' → 'description'
 */
function normalizeMetadata(rawMetadata: Metadata): Metadata {
  const normalized: Metadata = {};
  for (const [key, value] of Object.entries(rawMetadata)) {
    const normalizedKey = normalizeMetadataKey(key);
    // First occurrence wins (original key takes priority)
    if (!(normalizedKey in normalized)) {
      normalized[normalizedKey] = value;
    }
  }
  return normalized;
}

/**
 * Apply string metadata fields to a recipe
 */
function applyStringFields(recipe: IRecipe, metadata: Metadata): void {
  const description = metadata[METADATA_KEYS.DESCRIPTION];
  if (description) {
    recipe.description = description;
  }

  const difficulty = metadata[METADATA_KEYS.DIFFICULTY];
  if (difficulty) {
    recipe.difficulty = difficulty;
  }

  const cuisine = metadata[METADATA_KEYS.CUISINE];
  if (cuisine) {
    recipe.cuisine = cuisine;
  }

  const course = metadata[METADATA_KEYS.COURSE];
  if (course) {
    recipe.course = course;
  }
}

/**
 * Apply time metadata fields to a recipe
 */
function applyTimeFields(recipe: IRecipe, metadata: Metadata): void {
  const prepTimeStr = metadata[METADATA_KEYS.PREP_TIME];
  if (prepTimeStr) {
    const prepTime = parseTimeString(prepTimeStr);
    if (prepTime !== undefined) {
      recipe.prepTime = prepTime;
    }
  }

  const cookTimeStr = metadata[METADATA_KEYS.COOK_TIME];
  if (cookTimeStr) {
    const cookTime = parseTimeString(cookTimeStr);
    if (cookTime !== undefined) {
      recipe.cookTime = cookTime;
    }
  }

  const totalTimeStr = metadata[METADATA_KEYS.TOTAL_TIME];
  if (totalTimeStr) {
    const totalTime = parseTimeString(totalTimeStr);
    if (totalTime !== undefined) {
      recipe.totalTime = totalTime;
    }
  }
}

/**
 * Parse comma-separated list (for diet)
 */
function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Apply extended metadata fields (author, diet, locale) to a recipe
 */
function applyExtendedMetadata(recipe: IRecipe, metadata: Metadata): void {
  const author = metadata['author'];
  if (author) {
    recipe.author = author;
  }

  const diet = metadata['diet'];
  if (diet) {
    recipe.diet = parseCommaSeparatedList(diet);
  }

  const locale = metadata['locale'];
  if (locale) {
    recipe.locale = locale;
  }
}

/**
 * Apply optional metadata fields to a recipe
 */
function applyOptionalMetadata(recipe: IRecipe, metadata: Metadata): void {
  applyStringFields(recipe, metadata);

  const servingsStr = metadata[METADATA_KEYS.SERVINGS];
  if (servingsStr) {
    const servings = parseServings(servingsStr);
    if (servings !== undefined) {
      recipe.servings = servings;
    }
  }

  applyTimeFields(recipe, metadata);

  const tagsStr = metadata[METADATA_KEYS.TAGS];
  if (tagsStr) {
    recipe.tags = parseTags(tagsStr);
  }

  applyExtendedMetadata(recipe, metadata);
}

/**
 * Collect ingredients and cookware from steps
 */
function collectFromSteps(steps: IStep[]): { ingredients: IIngredient[]; cookware: ICookware[] } {
  const ingredients: IIngredient[] = [];
  const cookware: ICookware[] = [];

  for (const step of steps) {
    if (step.ingredients) {
      ingredients.push(...step.ingredients);
    }
    if (step.cookware) {
      cookware.push(...step.cookware);
    }
  }

  return { ingredients, cookware };
}

/**
 * Build the base recipe object
 */
function buildRecipe(
  context: ParseContext,
  title: string,
  slug: string,
  ingredients: IIngredient[],
  cookware: ICookware[],
  steps: IStep[],
): IRecipe {
  const now = new Date();
  return {
    filePath: context.filePath,
    gitCommitHash: context.gitCommitHash,
    title,
    slug,
    ingredients: deduplicateIngredients(ingredients),
    cookware: deduplicateCookware(cookware),
    steps,
    tags: [],
    photoUrls: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Parse a Cooklang source string into an IRecipe
 */
export async function parseCooklang(source: string, context: ParseContext): Promise<ParseOutput> {
  return withTrace('cooklang.parse', async (span) => {
    span.setAttribute('file_path', context.filePath);

    try {
      const cooklang = new CooklangRecipe(source);
      const metadata = normalizeMetadata(cooklang.metadata);
      const title = metadata[METADATA_KEYS.TITLE] || titleFromFilePath(context.filePath);
      const slug = generateSlug(metadata[METADATA_KEYS.TITLE] || context.filePath);

      // Convert steps
      const steps: IStep[] = cooklang.steps.map(convertStep);

      // Collect ingredients and cookware
      const fromSteps = collectFromSteps(steps);
      const allIngredients = [
        ...fromSteps.ingredients,
        ...cooklang.ingredients.map(convertIngredient),
      ];
      const allCookware = [...fromSteps.cookware, ...cooklang.cookwares.map(convertCookware)];

      // Build recipe
      const recipe = buildRecipe(context, title, slug, allIngredients, allCookware, steps);

      // Apply optional metadata
      applyOptionalMetadata(recipe, metadata);

      span.setAttribute('ingredients_count', recipe.ingredients.length);
      span.setAttribute('steps_count', recipe.steps.length);

      logger.recipes.debug('Parsed cooklang file', {
        filePath: context.filePath,
        title: recipe.title,
        ingredientsCount: recipe.ingredients.length,
        stepsCount: recipe.steps.length,
      });

      return { success: true, recipe };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      logger.recipes.error(
        'Failed to parse cooklang file',
        error instanceof Error ? error : undefined,
        {
          filePath: context.filePath,
        },
      );
      span.setAttribute('error', message);
      return { success: false, error: message };
    }
  });
}
