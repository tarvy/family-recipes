'use client';

/**
 * Form for manually adding items to a shopping list
 */

import { useState } from 'react';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

interface AddItemFormProps {
  /** Callback when a new item is added */
  onAddItem: (name: string, quantity?: string) => void;
}

/**
 * Add item form component
 */
export function AddItemForm({ onAddItem }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    onAddItem(trimmedName, quantity.trim() || undefined);
    setName('');
    setQuantity('');
  }

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-lavender hover:text-lavender"
      >
        <PlusIcon className="h-4 w-4" />
        Add custom item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender"
        />
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty (optional)"
          className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setName('');
            setQuantity('');
          }}
          className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-lg bg-lavender px-4 py-2 text-sm font-medium text-white hover:bg-lavender/90 disabled:opacity-50"
        >
          Add item
        </button>
      </div>
    </form>
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
