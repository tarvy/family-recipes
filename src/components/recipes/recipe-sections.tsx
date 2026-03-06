/**
 * Curated recipe sections for the main recipes page.
 *
 * Renders Most Used, Recently Used, Recently Added, and Random sections.
 * Empty sections are automatically hidden by RecipeSection.
 */

import type { RecipeSectionsData } from '@/lib/recipes/loader';
import { RecipeSection } from './recipe-section';
import { ShuffleButton } from './shuffle-button';

interface RecipeSectionsProps {
  sections: RecipeSectionsData;
  canDelete: boolean;
  isFamily: boolean;
}

export function RecipeSections({ sections, canDelete, isFamily }: RecipeSectionsProps) {
  const hasAnySections =
    sections.mostUsed.length > 0 ||
    sections.recentlyUsed.length > 0 ||
    sections.recentlyAdded.length > 0 ||
    sections.random.length > 0;

  if (!hasAnySections) {
    return null;
  }

  return (
    <div className="mb-8 space-y-8">
      <RecipeSection
        title="Most Used"
        recipes={sections.mostUsed}
        canDelete={canDelete}
        isFamily={isFamily}
      />
      <RecipeSection
        title="Recently Used"
        recipes={sections.recentlyUsed}
        canDelete={canDelete}
        isFamily={isFamily}
      />
      <RecipeSection
        title="Recently Added"
        recipes={sections.recentlyAdded}
        canDelete={canDelete}
        isFamily={isFamily}
      />
      <RecipeSection
        title="Random"
        recipes={sections.random}
        canDelete={canDelete}
        isFamily={isFamily}
        action={<ShuffleButton />}
      />
    </div>
  );
}
