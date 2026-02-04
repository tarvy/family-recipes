'use client';

import { useEffect, useRef } from 'react';
import { formatAmount, parseQuantity } from '@/lib/shopping/aggregator';

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface IngredientTooltipProps {
  ingredient: Ingredient;
  multiplier: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Scale a quantity string by a multiplier
 */
function scaleQuantity(quantity: string | undefined, multiplier: number): string | undefined {
  if (!quantity || multiplier === 1) {
    return quantity;
  }
  const parsed = parseQuantity(quantity);
  if (!parsed) {
    return quantity;
  }
  return formatAmount(parsed.amount * multiplier);
}

/**
 * Format an ingredient for tooltip display with scaled quantity
 */
function formatIngredientForTooltip(ingredient: Ingredient, multiplier: number): string {
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
 * Tooltip showing full ingredient measurement.
 *
 * Displays scaled quantity based on current multiplier.
 * Positioned above the trigger element.
 */
export function IngredientTooltip({
  ingredient,
  multiplier,
  isOpen,
  onClose,
}: IngredientTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Delay to prevent immediate close from the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 animate-in fade-in-0 zoom-in-95"
      data-ingredient-tooltip
    >
      <div className="whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg">
        {formatIngredientForTooltip(ingredient, multiplier)}
      </div>
      {/* Arrow */}
      <div className="absolute left-1/2 top-full -translate-x-1/2">
        <div className="h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-border" />
        <div className="absolute -top-px left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-card" />
      </div>
    </div>
  );
}
