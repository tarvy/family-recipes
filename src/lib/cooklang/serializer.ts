/**
 * Cooklang serializer - converts IRecipe to .cook format
 *
 * Generates valid Cooklang syntax from recipe data.
 *
 * Usage:
 *   import { serializeToCooklang } from '@/lib/cooklang';
 *
 *   const cooklangSource = serializeToCooklang(recipe);
 */

import type { ICookware, IIngredient, IRecipe, IStep } from '@/db/types';
import { METADATA_KEYS } from './constants';

/**
 * Escape special characters in ingredient/cookware names for Cooklang
 */
function escapeName(name: string): string {
  // If name contains spaces or special chars, it should be wrapped in the syntax
  return name;
}

/**
 * Format an ingredient reference for inline use in steps
 * Format: @ingredient{quantity%unit} or @ingredient{quantity} or @ingredient
 */
function formatIngredientRef(ing: IIngredient): string {
  const name = escapeName(ing.name);
  const hasMultipleWords = name.includes(' ');
  const namePrefix = hasMultipleWords ? `@${name}{` : `@${name}`;
  const nameSuffix = hasMultipleWords ? '}' : '';

  if (ing.quantity && ing.unit) {
    if (hasMultipleWords) {
      return `@${name}{${ing.quantity}%${ing.unit}}`;
    }
    return `@${name}{${ing.quantity}%${ing.unit}}`;
  }

  if (ing.quantity) {
    if (hasMultipleWords) {
      return `@${name}{${ing.quantity}}`;
    }
    return `@${name}{${ing.quantity}}`;
  }

  return `${namePrefix}${nameSuffix}`;
}

/**
 * Format a cookware reference for inline use in steps
 * Format: #cookware{quantity} or #cookware
 */
function formatCookwareRef(cw: ICookware): string {
  const name = escapeName(cw.name);
  const hasMultipleWords = name.includes(' ');

  if (cw.quantity && cw.quantity > 1) {
    return `#${name}{${cw.quantity}}`;
  }

  if (hasMultipleWords) {
    return `#${name}{}`;
  }

  return `#${name}`;
}

/**
 * Format a timer for inline use in steps
 * Format: ~{duration%unit} or ~name{duration%unit}
 */
function formatTimer(timer: { duration: number; unit: string }, name?: string): string {
  if (name) {
    return `~${name}{${timer.duration}%${timer.unit}}`;
  }
  return `~{${timer.duration}%${timer.unit}}`;
}

/**
 * Serialize metadata to Cooklang format
 * Format: >> key: value
 */
function serializeMetadata(recipe: IRecipe): string[] {
  const lines: string[] = [];

  // Always include title
  lines.push(`>> ${METADATA_KEYS.TITLE}: ${recipe.title}`);

  if (recipe.description) {
    lines.push(`>> ${METADATA_KEYS.DESCRIPTION}: ${recipe.description}`);
  }

  if (recipe.servings) {
    lines.push(`>> ${METADATA_KEYS.SERVINGS}: ${recipe.servings}`);
  }

  if (recipe.prepTime) {
    lines.push(`>> ${METADATA_KEYS.PREP_TIME}: ${recipe.prepTime} minutes`);
  }

  if (recipe.cookTime) {
    lines.push(`>> ${METADATA_KEYS.COOK_TIME}: ${recipe.cookTime} minutes`);
  }

  if (recipe.totalTime) {
    lines.push(`>> ${METADATA_KEYS.TOTAL_TIME}: ${recipe.totalTime} minutes`);
  }

  if (recipe.difficulty) {
    lines.push(`>> ${METADATA_KEYS.DIFFICULTY}: ${recipe.difficulty}`);
  }

  if (recipe.cuisine) {
    lines.push(`>> ${METADATA_KEYS.CUISINE}: ${recipe.cuisine}`);
  }

  if (recipe.course) {
    lines.push(`>> ${METADATA_KEYS.COURSE}: ${recipe.course}`);
  }

  if (recipe.tags.length > 0) {
    lines.push(`>> ${METADATA_KEYS.TAGS}: ${recipe.tags.join(', ')}`);
  }

  return lines;
}

/**
 * Attempt to reconstruct a step with inline Cooklang syntax
 *
 * This is a best-effort reconstruction. If the step has embedded
 * ingredients/cookware/timers, we try to inline them. Otherwise,
 * we just output the text with ingredients listed separately.
 */
function serializeStep(step: IStep): string {
  // If the step has no special elements, just return the text
  if (!(step.ingredients?.length || step.cookware?.length || step.timers?.length)) {
    return step.text;
  }

  // Build a map of what to replace in the text
  let result = step.text;

  // Try to replace ingredient names with Cooklang syntax
  if (step.ingredients) {
    for (const ing of step.ingredients) {
      // Find the ingredient name in the text and replace with Cooklang syntax
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(ing.name)}\\b`, 'i');
      const ref = formatIngredientRef(ing);
      result = result.replace(regex, ref);
    }
  }

  // Try to replace cookware names with Cooklang syntax
  if (step.cookware) {
    for (const cw of step.cookware) {
      const regex = new RegExp(`\\b${escapeRegex(cw.name)}\\b`, 'i');
      const ref = formatCookwareRef(cw);
      result = result.replace(regex, ref);
    }
  }

  // Try to replace timer values with Cooklang syntax
  if (step.timers) {
    for (const timer of step.timers) {
      // Try to find and replace patterns like "5 minutes" or "30 seconds"
      const regex = new RegExp(`\\b${timer.duration}\\s*${escapeRegex(timer.unit)}\\b`, 'i');
      const ref = formatTimer(timer);
      result = result.replace(regex, ref);
    }
  }

  return result;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Serialize an IRecipe to Cooklang format
 */
export function serializeToCooklang(recipe: IRecipe): string {
  const sections: string[] = [];

  // Metadata section
  const metadata = serializeMetadata(recipe);
  if (metadata.length > 0) {
    sections.push(metadata.join('\n'));
  }

  // Steps section
  if (recipe.steps.length > 0) {
    const steps = recipe.steps.map(serializeStep);
    sections.push(steps.join('\n\n'));
  }

  return `${sections.join('\n\n')}\n`;
}

/**
 * Format a complete recipe as Cooklang with ingredient list header
 *
 * This alternative format lists all ingredients upfront as comments,
 * which can be useful for shopping list generation.
 */
export function serializeToCooklangWithIngredientList(recipe: IRecipe): string {
  const sections: string[] = [];

  // Metadata section
  const metadata = serializeMetadata(recipe);
  if (metadata.length > 0) {
    sections.push(metadata.join('\n'));
  }

  // Ingredient list as comments (for reference)
  if (recipe.ingredients.length > 0) {
    const ingredientComments = recipe.ingredients.map((ing) => {
      const qty = ing.quantity ? `${ing.quantity} ` : '';
      const unit = ing.unit ? `${ing.unit} ` : '';
      return `-- ${qty}${unit}${ing.name}`;
    });
    sections.push(ingredientComments.join('\n'));
  }

  // Cookware list as comments (for reference)
  if (recipe.cookware.length > 0) {
    const cookwareComments = recipe.cookware.map((cw) => {
      const qty = cw.quantity && cw.quantity > 1 ? `${cw.quantity}x ` : '';
      return `-- ${qty}${cw.name}`;
    });
    sections.push(cookwareComments.join('\n'));
  }

  // Steps section
  if (recipe.steps.length > 0) {
    const steps = recipe.steps.map(serializeStep);
    sections.push(steps.join('\n\n'));
  }

  return `${sections.join('\n\n')}\n`;
}
