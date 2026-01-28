'use client';

/**
 * Dynamic ingredient list input component
 *
 * Allows adding/removing ingredient rows with name, quantity, and unit fields.
 */

import { useId } from 'react';
import { Button, Input } from '@/components/ui';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/** Minimum rows to show initially */
const INITIAL_ROW_COUNT = 3;

export interface IngredientRow {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

interface IngredientInputProps {
  ingredients: IngredientRow[];
  onChange: (ingredients: IngredientRow[]) => void;
}

/** Counter for generating unique IDs */
let idCounter = 0;

/**
 * Generate a unique ID for ingredient rows
 */
function generateId(): string {
  idCounter += 1;
  return `ing-${idCounter}`;
}

/**
 * Create empty ingredient rows for initial state
 */
export function createEmptyIngredients(): IngredientRow[] {
  return Array.from({ length: INITIAL_ROW_COUNT }, () => ({
    id: generateId(),
    name: '',
    quantity: '',
    unit: '',
  }));
}

/**
 * Dynamic ingredient list input
 */
export function IngredientInput({ ingredients, onChange }: IngredientInputProps) {
  const labelId = useId();

  function handleChange(id: string, field: keyof Omit<IngredientRow, 'id'>, value: string) {
    const updated = ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing));
    onChange(updated);
  }

  function handleAdd() {
    onChange([...ingredients, { id: generateId(), name: '', quantity: '', unit: '' }]);
  }

  function handleRemove(id: string) {
    if (ingredients.length <= 1) {
      return;
    }
    onChange(ingredients.filter((ing) => ing.id !== id));
  }

  return (
    <div className="space-y-3">
      <div
        id={labelId}
        className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_40px] sm:gap-2 sm:text-sm sm:font-medium sm:text-muted-foreground"
      >
        <span>Ingredient</span>
        <span>Qty</span>
        <span>Unit</span>
        <span />
      </div>

      {ingredients.map((ing) => (
        <div
          key={ing.id}
          className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_80px_80px_40px]"
        >
          <Input
            type="text"
            placeholder="Ingredient name"
            value={ing.name}
            onChange={(e) => handleChange(ing.id, 'name', e.target.value)}
          />
          <Input
            type="text"
            placeholder="Qty"
            value={ing.quantity}
            onChange={(e) => handleChange(ing.id, 'quantity', e.target.value)}
            className="hidden sm:block"
          />
          <Input
            type="text"
            placeholder="Unit"
            value={ing.unit}
            onChange={(e) => handleChange(ing.id, 'unit', e.target.value)}
            className="hidden sm:block"
          />
          <button
            type="button"
            onClick={() => handleRemove(ing.id)}
            disabled={ingredients.length <= 1}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            aria-label="Remove ingredient"
          >
            <XIcon />
          </button>

          {/* Mobile-only quantity/unit row */}
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:hidden">
            <Input
              type="text"
              placeholder="Quantity"
              value={ing.quantity}
              onChange={(e) => handleChange(ing.id, 'quantity', e.target.value)}
            />
            <Input
              type="text"
              placeholder="Unit"
              value={ing.unit}
              onChange={(e) => handleChange(ing.id, 'unit', e.target.value)}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        onClick={handleAdd}
        className="text-lavender hover:text-lavender hover:bg-lavender-light"
      >
        <PlusIcon />
        Add ingredient
      </Button>
    </div>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5"
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

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
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
