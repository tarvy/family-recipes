/**
 * Recipe categories: the one list of valid categories.
 *
 * Usage:
 *   import { isRecipeCategory, RECIPE_CATEGORIES } from '@/lib/recipes/categories';
 *
 *   if (isRecipeCategory(input)) {
 *     await createRecipe(content, input, 'api');
 *   }
 */

export const RECIPE_CATEGORIES = [
  'breakfast',
  'cocktails',
  'desserts',
  'entrees',
  'salads',
  'sides',
  'soups',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

const CATEGORY_SET: ReadonlySet<string> = new Set(RECIPE_CATEGORIES);

export function isRecipeCategory(value: string): value is RecipeCategory {
  return CATEGORY_SET.has(value);
}
