'use client';

/** Horizontal snap-scroll container for draggable recipe cards. */

import { DraggableRecipeCard, type SourceRecipe } from './draggable-recipe-card';

interface RecipeScrollProps {
  recipes: SourceRecipe[];
}

export function RecipeScroll({ recipes }: RecipeScrollProps) {
  if (recipes.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No recipes found</p>;
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
      style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
    >
      {recipes.map((recipe) => (
        <div key={recipe.id} style={{ scrollSnapAlign: 'start' }}>
          <DraggableRecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  );
}
