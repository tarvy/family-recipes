/**
 * Curated recipe sections for the main recipes page.
 *
 * Renders Most Used, Recently Used, Recently Added, and Random sections.
 * Empty sections are automatically hidden by RecipeSection.
 */

import type { RecipeSectionsData } from '@/lib/recipes/loader';
import { RecipeSection } from './recipe-section';

interface RecipeSectionsProps {
  sections: RecipeSectionsData;
  canDelete: boolean;
}

export function RecipeSections({ sections, canDelete }: RecipeSectionsProps) {
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
      <RecipeSection title="Most Used" recipes={sections.mostUsed} canDelete={canDelete} />
      <RecipeSection title="Recently Used" recipes={sections.recentlyUsed} canDelete={canDelete} />
      <RecipeSection
        title="Recently Added"
        recipes={sections.recentlyAdded}
        canDelete={canDelete}
      />
      <RecipeSection title="Random" recipes={sections.random} canDelete={canDelete} />
    </div>
  );
}
