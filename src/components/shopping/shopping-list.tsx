'use client';

/**
 * Shopping list display component
 *
 * Renders shopping items organized by grocery category with
 * checkboxes, progress indicators, and collapse/expand functionality.
 */

import { useState } from 'react';
import type { AggregatedIngredient, GroceryCategory } from '@/lib/shopping';
import { CATEGORY_LABELS } from '@/lib/shopping/categories';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

interface ShoppingListProps {
  /** All items in the list */
  items: AggregatedIngredient[];
  /** Items grouped by category */
  itemsByCategory: Partial<Record<GroceryCategory, AggregatedIngredient[]>>;
  /** Categories that have items, in order */
  categoriesWithItems: GroceryCategory[];
  /** Set of checked item IDs */
  checkedItems: Set<string>;
  /** Callback when an item is toggled */
  onToggleItem: (itemId: string) => void;
  /** Callback to clear all checked items */
  onClearChecked: () => void;
}

/**
 * Shopping list component with category sections
 */
export function ShoppingList({
  items,
  itemsByCategory,
  categoriesWithItems,
  checkedItems,
  onToggleItem,
  onClearChecked,
}: ShoppingListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<GroceryCategory>>(new Set());

  const totalItems = items.length;
  const checkedCount = checkedItems.size;
  const hasCheckedItems = checkedCount > 0;

  function toggleCategory(category: GroceryCategory) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  if (totalItems === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm ring-1 ring-border">
        <CartIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">Your shopping list is empty</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add recipes to generate a shopping list of ingredients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {checkedCount} of {totalItems} items checked
        </div>
        {hasCheckedItems && (
          <button
            type="button"
            onClick={onClearChecked}
            className="text-sm font-medium text-lavender hover:text-lavender-dark"
          >
            Clear checked
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-pink-light">
        <div
          className="h-full bg-lavender transition-all duration-300"
          style={{ width: `${(checkedCount / totalItems) * 100}%` }}
        />
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {categoriesWithItems.map((category) => {
          const categoryItems = itemsByCategory[category] ?? [];
          const checkedInCategory = categoryItems.filter((item) =>
            checkedItems.has(item.id),
          ).length;
          const isCollapsed = collapsedCategories.has(category);

          return (
            <CategorySection
              key={category}
              category={category}
              items={categoryItems}
              checkedItems={checkedItems}
              checkedCount={checkedInCategory}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCategory(category)}
              onToggleItem={onToggleItem}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: GroceryCategory;
  items: AggregatedIngredient[];
  checkedItems: Set<string>;
  checkedCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleItem: (itemId: string) => void;
}

/**
 * Collapsible category section
 */
function CategorySection({
  category,
  items,
  checkedItems,
  checkedCount,
  isCollapsed,
  onToggleCollapse,
  onToggleItem,
}: CategorySectionProps) {
  const totalInCategory = items.length;
  const allChecked = checkedCount === totalInCategory;

  // Sort items: unchecked first, then checked
  const sortedItems = [...items].sort((a, b) => {
    const aChecked = checkedItems.has(a.id);
    const bChecked = checkedItems.has(b.id);
    if (aChecked === bChecked) {
      return 0;
    }
    return aChecked ? 1 : -1;
  });

  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border">
      {/* Category header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-pink-light/50"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon
            className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <span className="font-medium text-foreground">{CATEGORY_LABELS[category]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${allChecked ? 'text-lavender' : 'text-muted-foreground'}`}>
            {checkedCount}/{totalInCategory}
          </span>
          {allChecked && <CheckCircleIcon className="h-4 w-4 text-lavender" />}
        </div>
      </button>

      {/* Items list */}
      {!isCollapsed && (
        <ul className="divide-y divide-border">
          {sortedItems.map((item) => (
            <ShoppingItem
              key={item.id}
              item={item}
              isChecked={checkedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ShoppingItemProps {
  item: AggregatedIngredient;
  isChecked: boolean;
  onToggle: () => void;
}

/**
 * Individual shopping list item
 */
function ShoppingItem({ item, isChecked, onToggle }: ShoppingItemProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isChecked
            ? 'border-lavender bg-lavender text-white'
            : 'border-muted-foreground hover:border-lavender'
        }`}
        aria-label={isChecked ? `Uncheck ${item.name}` : `Check ${item.name}`}
      >
        {isChecked && <CheckIcon className="h-3 w-3" />}
      </button>
      <div
        className={`flex-1 ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
      >
        <span className="capitalize">{item.name}</span>
        {item.displayQuantity && (
          <span className="ml-2 text-sm text-muted-foreground">({item.displayQuantity})</span>
        )}
      </div>
    </li>
  );
}

/**
 * Shopping cart icon
 */
function CartIcon({ className }: { className?: string }) {
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
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

/**
 * Chevron icon for collapse/expand
 */
function ChevronIcon({ className }: { className?: string }) {
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

/**
 * Check icon for checkboxes
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Check circle icon for completed categories
 */
function CheckCircleIcon({ className }: { className?: string }) {
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
