/** Automatic tag generation for discovery recipes. */

import type { CleanedMeal } from '@/lib/discovery/types';

const NOTABLE_INGREDIENTS = new Set([
  'chicken',
  'beef',
  'pork',
  'lamb',
  'fish',
  'shrimp',
  'tofu',
  'rice',
  'pasta',
  'noodles',
  'lentils',
  'beans',
  'eggs',
  'salmon',
  'tuna',
  'turkey',
  'duck',
  'crab',
  'lobster',
  'mushroom',
  'avocado',
  'chocolate',
  'cheese',
  'coconut',
]);

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function addExistingTags(tags: Set<string>, rawTags: string): void {
  for (const tag of rawTags.split(',')) {
    const normalized = normalizeTag(tag);
    if (normalized) {
      tags.add(normalized);
    }
  }
}

function addCategoryAndCuisine(tags: Set<string>, meal: CleanedMeal): void {
  if (meal.category?.trim()) {
    tags.add(normalizeTag(meal.category));
  }

  if (meal.cuisine?.trim()) {
    tags.add(normalizeTag(meal.cuisine));
  }
}

function addNotableIngredientTags(tags: Set<string>, meal: CleanedMeal): void {
  for (const ingredient of meal.ingredients) {
    const normalizedIngredient = ingredient.name.toLowerCase();
    for (const notable of NOTABLE_INGREDIENTS) {
      if (normalizedIngredient.includes(notable)) {
        tags.add(notable);
      }
    }
  }
}

export function generateTags(meal: CleanedMeal): string[] {
  const tags = new Set<string>();

  if (meal.tags?.trim()) {
    addExistingTags(tags, meal.tags);
  } else {
    addCategoryAndCuisine(tags, meal);
    addNotableIngredientTags(tags, meal);
  }

  return Array.from(tags)
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0)
    .sort((left, right) => left.localeCompare(right));
}
