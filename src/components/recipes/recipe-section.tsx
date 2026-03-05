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
  isFamily: boolean;
  /** Optional action element rendered in the section header (e.g. shuffle button) */
  action?: React.ReactNode;
}

export function RecipeSection({ title, recipes, canDelete, isFamily, action }: RecipeSectionProps) {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="relative">
        <div
          className="flex gap-4 overflow-x-auto pb-2 pr-4 snap-x snap-mandatory scrollbar-thin"
          style={{
            maskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 95%, transparent 100%)',
          }}
        >
          {recipes.map((recipe) => (
            <div key={recipe.slug} className="w-64 shrink-0 snap-start">
              <RecipeCard recipe={recipe} canDelete={canDelete} isFamily={isFamily} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
