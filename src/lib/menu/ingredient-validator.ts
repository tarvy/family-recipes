/** Ingredient parseability validator for discovery recipes during finalization. */

import type { IDiscoveryRecipe } from '@/db/types';
import { parseQuantity } from '@/lib/shopping/aggregator';

/** Result of validating a discovery recipe's ingredients. */
export interface ValidationResult {
  /** True if all ingredients with quantities are parseable. */
  parseable: boolean;
  /** Names of ingredients whose quantities could not be parsed. */
  failedIngredients: string[];
}

/**
 * Check whether all ingredients in a discovery recipe are parseable
 * for shopping list aggregation.
 *
 * An ingredient is "parseable" if:
 * - It has no quantity (name-only items are always accepted)
 * - Its quantity string can be parsed by parseQuantity
 *
 * A recipe is parseable only when ALL its ingredients pass.
 * When a recipe fails, it is excluded from the shopping list and
 * an alert is surfaced during menu finalization.
 */
export function validateDiscoveryIngredients(recipe: IDiscoveryRecipe): ValidationResult {
  const failedIngredients: string[] = [];

  for (const ingredient of recipe.ingredients) {
    if (!ingredient.quantity || ingredient.quantity.trim() === '') {
      // Name-only ingredients are always parseable
      continue;
    }

    const parsed = parseQuantity(ingredient.quantity);
    if (!parsed) {
      failedIngredients.push(ingredient.name);
    }
  }

  return {
    parseable: failedIngredients.length === 0,
    failedIngredients,
  };
}
