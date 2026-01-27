import type { RecipePreview } from '@/lib/recipes/loader';
import { RecipeCard } from './recipe-card';

interface RecipeGridProps {
  recipes: RecipePreview[];
}

/**
 * Responsive grid layout for recipe cards
 *
 * Breakpoints:
 * - Mobile (<640px): 1 column
 * - Tablet (640-1024px): 2 columns
 * - Desktop (1024-1280px): 3 columns
 * - Large (>1280px): 4 columns
 */
export function RecipeGrid({ recipes }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">No recipes found</p>
        <p className="mt-2 text-sm text-gray-400">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} />
      ))}
    </div>
  );
}
