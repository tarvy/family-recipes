'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui';
import type { RecipePreview, RecipeSectionsData } from '@/lib/recipes/loader';
import { RandomRecipeCookieSetter } from './random-recipe-cookie';
import { RecipeCategoryPills } from './recipe-filters';
import { RecipeGrid } from './recipe-grid';
import { RecipeSections } from './recipe-sections';

/** Debounce delay for search input in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

/** SVG stroke width for icons */
const ICON_STROKE_WIDTH = 2;

/** Search icon size in pixels */
const SEARCH_ICON_SIZE_PX = 20;

interface RecipeBrowserProps {
  recipes: RecipePreview[];
  categories: string[];
  canDelete: boolean;
  sections: RecipeSectionsData;
  /** Whether to set the random-recipes cookie (true when no cookie existed on load) */
  needsRandomCookie: boolean;
}

/**
 * Client-side recipe browser with search, sections, and filtering
 *
 * Layout: Search → Sections (hidden when searching) → Category pills → Grid
 */
export function RecipeBrowser({
  recipes,
  categories,
  canDelete,
  sections,
  needsRandomCookie,
}: RecipeBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCategory = searchParams.get('category') ?? '';
  const initialQuery = searchParams.get('q') ?? '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const isSearching = searchQuery.length > 0;

  const updateSearchUrl = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set('q', query);
      } else {
        params.delete('q');
      }
      const queryString = params.toString();
      const url = queryString ? `/recipes?${queryString}` : '/recipes';
      router.push(url, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateSearchUrl(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, updateSearchUrl]);

  const filteredRecipes = useMemo(() => {
    let result = recipes;

    if (selectedCategory) {
      result = result.filter((recipe) => recipe.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((recipe) => recipe.title.toLowerCase().includes(query));
    }

    return result;
  }, [recipes, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search input — always at top */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="py-2 pl-10 pr-4"
        />
      </div>

      {/* Sections — hidden when searching */}
      {!isSearching && <RecipeSections sections={sections} canDelete={canDelete} />}

      {/* Set random-recipes cookie when server generated a fresh set */}
      {needsRandomCookie && sections.randomSlugs.length > 0 && (
        <RandomRecipeCookieSetter slugs={sections.randomSlugs} />
      )}

      {/* Category pills + grid */}
      <RecipeCategoryPills categories={categories} />
      <RecipeGrid recipes={filteredRecipes} canDelete={canDelete} />
    </div>
  );
}

/**
 * Search icon component
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={SEARCH_ICON_SIZE_PX}
      height={SEARCH_ICON_SIZE_PX}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
