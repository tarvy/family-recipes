'use client';

/** Container composing recipe source tabs, search, and scrollable cards. */

import { useMemo } from 'react';
import { fuzzySearch } from '@/lib/menu/fuzzy-search';
import type { RecipePreview } from '@/lib/recipes/loader';
import type { SourceRecipe } from './draggable-recipe-card';
import { RecipeScroll } from './recipe-scroll';
import { RecipeSearch } from './recipe-search';
import { RecipeSourceTabs } from './recipe-source-tabs';

interface RecipeSourcePanelProps {
  recipes: RecipePreview[];
  activeTab: 'cookbook' | 'discovery';
  searchQuery: string;
  onTabChange: (tab: 'cookbook' | 'discovery') => void;
  onSearchChange: (query: string) => void;
}

function toSourceRecipe(preview: RecipePreview): SourceRecipe {
  const result: SourceRecipe = {
    id: preview.slug,
    title: preview.title,
    source: 'cookbook',
  };
  if (preview.category !== undefined) {
    result.category = preview.category;
  }
  return result;
}

export function RecipeSourcePanel({
  recipes,
  activeTab,
  searchQuery,
  onTabChange,
  onSearchChange,
}: RecipeSourcePanelProps) {
  const filteredRecipes = useMemo(
    () => fuzzySearch(recipes, searchQuery, 'title'),
    [recipes, searchQuery],
  );

  const sourceRecipes = useMemo(() => filteredRecipes.map(toSourceRecipe), [filteredRecipes]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RecipeSourceTabs activeTab={activeTab} onTabChange={onTabChange} />
        <div className="w-full sm:w-56">
          <RecipeSearch value={searchQuery} onChange={onSearchChange} />
        </div>
      </div>

      {activeTab === 'cookbook' ? (
        <RecipeScroll recipes={sourceRecipes} />
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Discovery recipes coming soon
        </p>
      )}
    </div>
  );
}
