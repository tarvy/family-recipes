'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui';

interface RecipeCategoryPillsProps {
  categories: string[];
}

/**
 * Category pill buttons for filtering recipes
 *
 * Features:
 * - Single-select category pills
 * - URL state persistence (?category=X)
 * - Preserves existing search query param
 */
export function RecipeCategoryPills({ categories }: RecipeCategoryPillsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get('category') ?? '';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  const updateUrl = useCallback(
    (category: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (category) {
        params.set('category', category);
      } else {
        params.delete('category');
      }
      const queryString = params.toString();
      const url = queryString ? `/recipes?${queryString}` : '/recipes';
      router.push(url, { scroll: false });
    },
    [router, searchParams],
  );

  function handleCategoryClick(category: string) {
    const newCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(newCategory);
    updateUrl(newCategory);
  }

  function handleClearFilters() {
    setSelectedCategory('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    params.delete('q');
    const queryString = params.toString();
    const url = queryString ? `/recipes?${queryString}` : '/recipes';
    router.push(url, { scroll: false });
  }

  const hasActiveFilters = selectedCategory || searchParams.get('q');

  return (
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

      {hasActiveFilters && (
        <Button type="button" variant="ghost" onClick={handleClearFilters} className="ml-2">
          Clear filters
        </Button>
      )}
    </div>
  );
}
