/** Best-effort conversion of DiscoveryRecipe data to Cooklang format. */

import type { IDiscoveryRecipe } from '@/db/types';

function formatIngredientRef(name: string, quantity?: string, unit?: string): string {
  const hasSpaces = name.includes(' ');

  if (quantity && unit) {
    return `@${name}{${quantity}%${unit}}`;
  }

  if (quantity) {
    return `@${name}{${quantity}}`;
  }

  if (hasSpaces) {
    return `@${name}{}`;
  }

  return `@${name}`;
}

export function toCooklang(recipe: IDiscoveryRecipe): string | null {
  if (!(recipe.ingredients.length && recipe.instructions)) {
    return null;
  }

  const lines: string[] = [];

  lines.push(`>> title: ${recipe.title}`);
  if (recipe.category) {
    lines.push(`>> category: ${recipe.category}`);
  }
  if (recipe.cuisine) {
    lines.push(`>> cuisine: ${recipe.cuisine}`);
  }
  if (recipe.tags.length > 0) {
    lines.push(`>> tags: ${recipe.tags.join(', ')}`);
  }

  lines.push('');

  const ingredientRefs = recipe.ingredients.map((ing) =>
    formatIngredientRef(ing.name, ing.quantity, ing.unit),
  );
  lines.push(ingredientRefs.join(', '));

  lines.push('');

  const steps = recipe.instructions
    .split(/\r?\n\r?\n|\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const step of steps) {
    lines.push(step);
    lines.push('');
  }

  return lines.join('\n');
}
