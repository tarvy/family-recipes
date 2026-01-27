'use client';

/**
 * Client-side shopping list manager
 *
 * Handles recipe selection, ingredient aggregation, and list state.
 * Uses localStorage for persistence in v1 (no auth required).
 */

import { useCallback, useEffect, useState } from 'react';
import { AddItemForm } from '@/components/shopping/add-item-form';
import { RecipeSelector } from '@/components/shopping/recipe-selector';
import { ShoppingList } from '@/components/shopping/shopping-list';
import type { RecipeDetail, RecipePreview } from '@/lib/recipes/loader';
import {
  type AggregatedIngredient,
  aggregateIngredients,
  type RecipeIngredients,
} from '@/lib/shopping/aggregator';
import {
  type GroceryCategory,
  getCategoriesWithItems,
  groupByCategory,
} from '@/lib/shopping/categories';

/** localStorage key for persisting shopping list state */
const STORAGE_KEY = 'family-recipes-shopping-list';

/** parseInt radix for decimal numbers */
const RADIX_DECIMAL = 10;

/** State shape for localStorage */
interface PersistedState {
  selectedRecipes: Record<string, number>; // slug → multiplier
  checkedItemIds: string[];
  manualItems: Array<{ name: string; quantity?: string }>;
}

interface ShoppingListClientProps {
  recipes: RecipePreview[];
}

/**
 * Shopping list client component
 */
export function ShoppingListClient({ recipes }: ShoppingListClientProps) {
  // State
  const [selectedRecipes, setSelectedRecipes] = useState<Map<string, number>>(new Map());
  const [recipeDetails, setRecipeDetails] = useState<Map<string, RecipeDetail>>(new Map());
  const [manualItems, setManualItems] = useState<Array<{ name: string; quantity?: string }>>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PersistedState;
        setSelectedRecipes(new Map(Object.entries(parsed.selectedRecipes ?? {})));
        setCheckedItems(new Set(parsed.checkedItemIds ?? []));
        setManualItems(parsed.manualItems ?? []);
      } catch {
        // Invalid stored data, start fresh
      }
    }
    setIsHydrated(true);
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const state: PersistedState = {
      selectedRecipes: Object.fromEntries(selectedRecipes),
      checkedItemIds: Array.from(checkedItems),
      manualItems,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [selectedRecipes, checkedItems, manualItems, isHydrated]);

  // Fetch recipe details when selection changes
  useEffect(() => {
    async function fetchRecipeDetails() {
      const slugsToFetch = Array.from(selectedRecipes.keys()).filter(
        (slug) => !recipeDetails.has(slug),
      );

      if (slugsToFetch.length === 0) {
        return;
      }

      setIsLoading(true);
      const newDetails = new Map(recipeDetails);

      for (const slug of slugsToFetch) {
        try {
          const response = await fetch(`/api/recipes/${slug}`);
          if (response.ok) {
            const detail = (await response.json()) as RecipeDetail;
            newDetails.set(slug, detail);
          }
        } catch {
          // Skip failed recipes
        }
      }

      setRecipeDetails(newDetails);
      setIsLoading(false);
    }

    fetchRecipeDetails();
  }, [selectedRecipes, recipeDetails]);

  // Build aggregated ingredients
  const buildAggregatedItems = useCallback((): AggregatedIngredient[] => {
    const recipeIngredients: RecipeIngredients[] = [];

    for (const [slug, multiplier] of selectedRecipes) {
      const detail = recipeDetails.get(slug);
      if (detail) {
        recipeIngredients.push({
          slug,
          ingredients: detail.ingredients,
          servingsMultiplier: multiplier,
        });
      }
    }

    const aggregated = aggregateIngredients(recipeIngredients);

    // Add manual items
    const manualAggregated: AggregatedIngredient[] = manualItems.map((item, index) => ({
      id: `manual-${index}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: item.name,
      quantities: [],
      displayQuantity: item.quantity ?? '',
      category: 'other' as GroceryCategory,
    }));

    return [...aggregated, ...manualAggregated];
  }, [selectedRecipes, recipeDetails, manualItems]);

  const items = buildAggregatedItems();
  const itemsByCategory = groupByCategory(items);
  const categoriesWithItems = getCategoriesWithItems(itemsByCategory);

  // Handlers
  function handleAddRecipe(slug: string) {
    setSelectedRecipes((prev) => new Map(prev).set(slug, 1));
  }

  function handleRemoveRecipe(slug: string) {
    setSelectedRecipes((prev) => {
      const next = new Map(prev);
      next.delete(slug);
      return next;
    });
  }

  function handleUpdateServings(slug: string, multiplier: number) {
    setSelectedRecipes((prev) => new Map(prev).set(slug, multiplier));
  }

  function handleToggleItem(itemId: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleClearChecked() {
    // Remove manual items that are checked
    const manualIdsToRemove = new Set<number>();
    for (const itemId of checkedItems) {
      if (itemId.startsWith('manual-')) {
        const match = itemId.match(/^manual-(\d+)-/);
        if (match?.[1]) {
          manualIdsToRemove.add(parseInt(match[1], RADIX_DECIMAL));
        }
      }
    }

    if (manualIdsToRemove.size > 0) {
      setManualItems((prev) => prev.filter((_, i) => !manualIdsToRemove.has(i)));
    }

    setCheckedItems(new Set());
  }

  function handleAddManualItem(name: string, quantity?: string | undefined) {
    const newItem: { name: string; quantity?: string } = { name };
    if (quantity !== undefined) {
      newItem.quantity = quantity;
    }
    setManualItems((prev) => [...prev, newItem]);
  }

  function handleClearList() {
    setSelectedRecipes(new Map());
    setManualItems([]);
    setCheckedItems(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  // Don't render until hydrated to avoid mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Recipe selector */}
      <section>
        <RecipeSelector
          recipes={recipes}
          selectedRecipes={selectedRecipes}
          onAddRecipe={handleAddRecipe}
          onRemoveRecipe={handleRemoveRecipe}
          onUpdateServings={handleUpdateServings}
        />
      </section>

      {/* Generate list button */}
      {selectedRecipes.size > 0 && isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner />
          Loading ingredients...
        </div>
      )}

      {/* Shopping list */}
      {items.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Shopping List</h2>
            <button
              type="button"
              onClick={handleClearList}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Clear all
            </button>
          </div>

          <ShoppingList
            items={items}
            itemsByCategory={itemsByCategory}
            categoriesWithItems={categoriesWithItems}
            checkedItems={checkedItems}
            onToggleItem={handleToggleItem}
            onClearChecked={handleClearChecked}
          />

          {/* Add manual item */}
          <AddItemForm onAddItem={handleAddManualItem} />
        </section>
      )}
    </div>
  );
}

/**
 * Loading spinner
 */
function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
