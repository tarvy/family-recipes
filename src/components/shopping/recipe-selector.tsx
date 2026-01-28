'use client';

/**
 * Recipe selector for shopping list creation
 *
 * Allows selecting recipes and adjusting servings multipliers.
 */

import { useState } from 'react';
import {
  DEFAULT_MULTIPLIER,
  MAX_MULTIPLIER,
  MIN_MULTIPLIER,
  MULTIPLIER_STEP,
} from '@/lib/constants/multiplier';
import type { RecipePreview } from '@/lib/recipes/loader';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

interface RecipeSelectorProps {
  /** Available recipes to choose from */
  recipes: RecipePreview[];
  /** Map of slug → servings multiplier for selected recipes */
  selectedRecipes: Map<string, number>;
  /** Callback when a recipe is added */
  onAddRecipe: (slug: string) => void;
  /** Callback when a recipe is removed */
  onRemoveRecipe: (slug: string) => void;
  /** Callback when servings multiplier is updated */
  onUpdateServings: (slug: string, multiplier: number) => void;
}

/**
 * Recipe selector component
 */
export function RecipeSelector({
  recipes,
  selectedRecipes,
  onAddRecipe,
  onRemoveRecipe,
  onUpdateServings,
}: RecipeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter recipes based on search
  const filteredRecipes = recipes.filter((recipe) => {
    const query = searchQuery.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(query) || recipe.category.toLowerCase().includes(query)
    );
  });

  // Get list of selected recipe objects
  const selectedRecipeList = recipes.filter((r) => selectedRecipes.has(r.slug));

  function handleSelectRecipe(slug: string) {
    if (!selectedRecipes.has(slug)) {
      onAddRecipe(slug);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  }

  function handleDecrementServings(slug: string) {
    const current = selectedRecipes.get(slug) ?? DEFAULT_MULTIPLIER;
    const newValue = Math.max(MIN_MULTIPLIER, current - MULTIPLIER_STEP);
    onUpdateServings(slug, newValue);
  }

  function handleIncrementServings(slug: string) {
    const current = selectedRecipes.get(slug) ?? DEFAULT_MULTIPLIER;
    const newValue = Math.min(MAX_MULTIPLIER, current + MULTIPLIER_STEP);
    onUpdateServings(slug, newValue);
  }

  return (
    <div className="space-y-4">
      {/* Search/Select input */}
      <div className="relative">
        <label htmlFor="recipe-search" className="block text-sm font-medium text-foreground">
          Add recipes
        </label>
        <div className="relative mt-1.5">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            id="recipe-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search recipes..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender"
          />
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
              {filteredRecipes.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No recipes found</div>
              ) : (
                <ul>
                  {filteredRecipes.map((recipe) => {
                    const isSelected = selectedRecipes.has(recipe.slug);
                    return (
                      <li key={recipe.slug}>
                        <button
                          type="button"
                          onClick={() => handleSelectRecipe(recipe.slug)}
                          disabled={isSelected}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                            isSelected
                              ? 'bg-lavender-light text-muted-foreground'
                              : 'hover:bg-pink-light'
                          }`}
                        >
                          <span className="font-medium">{recipe.title}</span>
                          <span className="text-muted-foreground capitalize">
                            {recipe.category}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected recipes */}
      {selectedRecipeList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Selected recipes ({selectedRecipeList.length})
          </h3>
          <ul className="space-y-2">
            {selectedRecipeList.map((recipe) => {
              const multiplier = selectedRecipes.get(recipe.slug) ?? DEFAULT_MULTIPLIER;
              return (
                <li
                  key={recipe.slug}
                  className="flex items-center justify-between rounded-lg bg-card p-3 shadow-sm ring-1 ring-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{recipe.title}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {recipe.category}
                    </div>
                  </div>

                  {/* Servings multiplier controls */}
                  <div className="ml-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecrementServings(recipe.slug)}
                      disabled={multiplier <= MIN_MULTIPLIER}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
                      aria-label="Decrease servings"
                    >
                      <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-foreground">
                      {multiplier}×
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrementServings(recipe.slug)}
                      disabled={multiplier >= MAX_MULTIPLIER}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
                      aria-label="Increase servings"
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => onRemoveRecipe(recipe.slug)}
                    className="ml-3 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${recipe.title}`}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Search icon
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

/**
 * Plus icon
 */
function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

/**
 * Minus icon
 */
function MinusIcon({ className }: { className?: string }) {
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
        d="M20 12H4"
      />
    </svg>
  );
}

/**
 * X/close icon
 */
function XIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
