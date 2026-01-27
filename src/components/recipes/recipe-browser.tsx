'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { RecipePreview } from '@/lib/recipes/loader';
import { RecipeFilters } from './recipe-filters';
import { RecipeGrid } from './recipe-grid';

interface RecipeBrowserProps {
  recipes: RecipePreview[];
  categories: string[];
}

/**
 * Client-side recipe browser with filtering
 *
 * Reads filter state from URL and applies client-side filtering
 * to the recipe list provided by the server.
 */
export function RecipeBrowser({ recipes, categories }: RecipeBrowserProps) {
  const searchParams = useSearchParams();

  // Read filter state from URL
  const selectedCategory = searchParams.get('category') ?? '';
  const searchQuery = searchParams.get('q') ?? '';

  // Apply filters client-side
  const filteredRecipes = useMemo(() => {
    let result = recipes;

    // Filter by category
    if (selectedCategory) {
      result = result.filter((recipe) => recipe.category === selectedCategory);
    }

    // Filter by search query (case-insensitive, matches title)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((recipe) => recipe.title.toLowerCase().includes(query));
    }

    return result;
  }, [recipes, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      <RecipeFilters categories={categories} />
      <RecipeGrid recipes={filteredRecipes} />
    </div>
  );
}
