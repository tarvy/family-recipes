'use client';

/**
 * Form for manually adding items to a shopping list
 */

import { useState } from 'react';
import { Button, Input } from '@/components/ui';

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
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="flex-1"
        />
        <Input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty (optional)"
          className="w-28"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsExpanded(false);
            setName('');
            setQuantity('');
          }}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" variant="secondary" disabled={!name.trim()} className="flex-1">
          Add item
        </Button>
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
