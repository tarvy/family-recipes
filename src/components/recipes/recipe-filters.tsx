'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/** Debounce delay for search input in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

/** SVG stroke width for icons */
const ICON_STROKE_WIDTH = 2;

interface RecipeFiltersProps {
  categories: string[];
}

/**
 * Recipe filter controls with search and category selection
 *
 * Features:
 * - Search input with 300ms debounce
 * - Category pill buttons (single-select)
 * - URL state persistence (?category=X&q=Y)
 */
export function RecipeFilters({ categories }: RecipeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial values from URL
  const initialCategory = searchParams.get('category') ?? '';
  const initialQuery = searchParams.get('q') ?? '';

  // Local state for immediate UI updates
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  /**
   * Update URL with current filter state
   */
  const updateUrl = useCallback(
    (category: string, query: string) => {
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      }
      if (query) {
        params.set('q', query);
      }
      const queryString = params.toString();
      const url = queryString ? `/recipes?${queryString}` : '/recipes';
      router.push(url, { scroll: false });
    },
    [router],
  );

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUrl(selectedCategory, searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, updateUrl]);

  /**
   * Handle category selection
   */
  function handleCategoryClick(category: string) {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    // Update URL immediately for category changes (no debounce)
    updateUrl(newCategory, searchQuery);
  }

  /**
   * Handle search input change
   */
  function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
  }

  /**
   * Clear all filters
   */
  function handleClearFilters() {
    setSearchQuery('');
    setSelectedCategory('');
    updateUrl('', '');
  }

  const hasActiveFilters = searchQuery || selectedCategory;

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full rounded-lg border border-input bg-card py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleCategoryClick('')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === ''
              ? 'bg-lavender text-white'
              : 'bg-pink-light text-foreground hover:bg-pink'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryClick(category)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              selectedCategory === category
                ? 'bg-lavender text-white'
                : 'bg-pink-light text-foreground hover:bg-pink'
            }`}
          >
            {category}
          </button>
        ))}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>
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
