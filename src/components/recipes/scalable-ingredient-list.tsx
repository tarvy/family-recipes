'use client';

import { useState } from 'react';
import {
  DEFAULT_MULTIPLIER,
  MAX_MULTIPLIER,
  MIN_MULTIPLIER,
  MULTIPLIER_STEP,
} from '@/lib/constants/multiplier';
import { formatAmount, parseQuantity } from '@/lib/shopping/aggregator';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface ScalableIngredientListProps {
  ingredients: Ingredient[];
  defaultServings?: number | undefined;
  /** External multiplier control (controlled mode) */
  multiplier?: number;
  /** Callback when multiplier changes (controlled mode) */
  onMultiplierChange?: (multiplier: number) => void;
}

/**
 * Scale a quantity string by a multiplier
 */
function scaleQuantity(quantity: string | undefined, multiplier: number): string | undefined {
  if (!quantity || multiplier === DEFAULT_MULTIPLIER) {
    return quantity;
  }
  const parsed = parseQuantity(quantity);
  if (!parsed) {
    return quantity;
  }
  return formatAmount(parsed.amount * multiplier);
}

/**
 * Create a stable key for an ingredient
 */
function createIngredientKey(ingredient: Ingredient): string {
  return `${ingredient.name}-${ingredient.quantity ?? ''}-${ingredient.unit ?? ''}`;
}

/**
 * Format an ingredient for display with scaled quantity
 */
function formatIngredient(ingredient: Ingredient, multiplier: number): string {
  const parts: string[] = [];

  if (ingredient.quantity) {
    const scaledQuantity = scaleQuantity(ingredient.quantity, multiplier);
    if (scaledQuantity) {
      parts.push(scaledQuantity);
    }
  }

  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  return parts.join(' ');
}

/**
 * Display a list of recipe ingredients with real-time quantity scaling
 *
 * Features:
 * - Multiplier controls (0.5× to 10×)
 * - Shows scaled servings if defaultServings provided
 * - Matches existing bullet styling (pink dots)
 */
export function ScalableIngredientList({
  ingredients,
  defaultServings,
  multiplier: externalMultiplier,
  onMultiplierChange,
}: ScalableIngredientListProps) {
  const [internalMultiplier, setInternalMultiplier] = useState(DEFAULT_MULTIPLIER);

  // Use external multiplier if provided (controlled mode), else internal state
  const isControlled = externalMultiplier !== undefined;
  const multiplier = isControlled ? externalMultiplier : internalMultiplier;

  function handleDecrement() {
    const newValue = Math.max(MIN_MULTIPLIER, multiplier - MULTIPLIER_STEP);
    if (isControlled && onMultiplierChange) {
      onMultiplierChange(newValue);
    } else {
      setInternalMultiplier(newValue);
    }
  }

  function handleIncrement() {
    const newValue = Math.min(MAX_MULTIPLIER, multiplier + MULTIPLIER_STEP);
    if (isControlled && onMultiplierChange) {
      onMultiplierChange(newValue);
    } else {
      setInternalMultiplier(newValue);
    }
  }

  if (ingredients.length === 0) {
    return <p className="text-muted-foreground italic">No ingredients listed for this recipe.</p>;
  }

  const scaledServings = defaultServings ? Math.round(defaultServings * multiplier) : null;

  return (
    <div>
      {/* Mobile: controls on top, right-aligned */}
      <div className="flex items-center justify-end gap-3 md:hidden">
        {defaultServings && scaledServings && (
          <span className="text-sm text-muted-foreground">
            {multiplier === DEFAULT_MULTIPLIER
              ? `${defaultServings} serving${defaultServings !== 1 ? 's' : ''}`
              : `${defaultServings} → ${scaledServings} serving${scaledServings !== 1 ? 's' : ''}`}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={multiplier <= MIN_MULTIPLIER}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
            aria-label="Decrease multiplier"
          >
            <MinusIcon className="h-3 w-3" />
          </button>
          <span className="w-10 text-center text-sm font-medium text-foreground">
            {multiplier}×
          </span>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={multiplier >= MAX_MULTIPLIER}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
            aria-label="Increase multiplier"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Desktop: two columns — ingredients left, controls right */}
      <div className="mt-3 flex gap-6 md:mt-0">
        {/* Ingredient list */}
        <ul className="min-w-0 flex-1 space-y-2">
          {ingredients.map((ingredient) => (
            <li key={createIngredientKey(ingredient)} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-pink"
                aria-hidden="true"
              />
              <span className="text-foreground">{formatIngredient(ingredient, multiplier)}</span>
            </li>
          ))}
        </ul>

        {/* Desktop controls — right column, top-aligned */}
        <div className="hidden shrink-0 items-start md:flex">
          <div className="flex items-center gap-3">
            {defaultServings && scaledServings && (
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {multiplier === DEFAULT_MULTIPLIER
                  ? `${defaultServings} serving${defaultServings !== 1 ? 's' : ''}`
                  : `${defaultServings} → ${scaledServings} serving${scaledServings !== 1 ? 's' : ''}`}
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={multiplier <= MIN_MULTIPLIER}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
                aria-label="Decrease multiplier"
              >
                <MinusIcon className="h-3 w-3" />
              </button>
              <span className="w-10 text-center text-sm font-medium text-foreground">
                {multiplier}×
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={multiplier >= MAX_MULTIPLIER}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-pink-light disabled:opacity-50 disabled:hover:bg-transparent"
                aria-label="Increase multiplier"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
