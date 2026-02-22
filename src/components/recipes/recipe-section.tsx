/**
 * Horizontal scroll section for a group of recipe cards.
 *
 * Renders a titled row of RecipeCards that scrolls horizontally on mobile.
 * Returns null when the recipe list is empty so sections hide automatically.
 */

import type { RecipePreview } from '@/lib/recipes/loader';
import { RecipeCard } from './recipe-card';

interface RecipeSectionProps {
  title: string;
  recipes: RecipePreview[];
  canDelete: boolean;
}

export function RecipeSection({ title, recipes, canDelete }: RecipeSectionProps) {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
          {recipes.map((recipe) => (
            <div key={recipe.slug} className="w-64 flex-shrink-0 snap-start">
              <RecipeCard recipe={recipe} canDelete={canDelete} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
