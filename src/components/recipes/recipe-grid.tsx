/**
 * Recipe Grid Component
 *
 * Responsive grid of recipe cards with a design-system empty state.
 */

import { EmptyState } from '@/components/ui';
import type { RecipePreview } from '@/lib/recipes/loader';
import { RecipeCard } from './recipe-card';

interface RecipeGridProps {
  recipes: RecipePreview[];
  canDelete: boolean;
  isFamily: boolean;
}

/**
 * Responsive grid layout for recipe cards
 *
 * Uses auto-fill with minmax(16rem, 1fr) to match RecipeSection card width (w-64).
 * Same gap-4 as RecipeSection for consistency.
 */
export function RecipeGrid({ recipes, canDelete, isFamily }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        title="No recipes found"
        description="Try adjusting your search or filter criteria"
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} canDelete={canDelete} isFamily={isFamily} />
      ))}
    </div>
  );
}
