'use client';

/**
 * Ingredient insertion popover
 *
 * Helper modal for inserting properly formatted Cooklang ingredient syntax.
 * Shows a preview of the generated syntax before insertion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { formatIngredient } from '@/lib/cooklang/metadata';
import { cn } from '@/lib/utils';

interface IngredientPopoverProps {
  /** Whether the popover is open */
  isOpen: boolean;
  /** Called when the popover should close */
  onClose: () => void;
  /** Called when user confirms insertion with the formatted ingredient */
  onInsert: (formattedIngredient: string) => void;
  /** Additional class names */
  className?: string;
}

export function IngredientPopover({
  isOpen,
  onClose,
  onInsert,
  className,
}: IngredientPopoverProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setQuantity('');
      setUnit('');
      // Focus the name input after a short delay to allow the modal to render
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Handle escape key
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

  const preview = formatIngredient(name || 'ingredient', quantity || undefined, unit || undefined);

  const handleInsert = useCallback(() => {
    if (!name.trim()) {
      return;
    }
    const formatted = formatIngredient(
      name.trim(),
      quantity.trim() || undefined,
      unit.trim() || undefined,
    );
    onInsert(formatted);
    onClose();
  }, [name, quantity, unit, onInsert, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleInsert();
    },
    [handleInsert],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingredient-popover-title"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
          'rounded-lg border border-border bg-card p-4 shadow-lg',
          className,
        )}
      >
        <h2 id="ingredient-popover-title" className="mb-4 text-lg font-semibold text-foreground">
          Insert Ingredient
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div>
            <label
              htmlFor="ingredient-name"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              ref={nameInputRef}
              id="ingredient-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., flour, olive oil"
              autoComplete="off"
            />
          </div>

          {/* Quantity and unit row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ingredient-quantity"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Quantity
              </label>
              <Input
                id="ingredient-quantity"
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 2, 1/2"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="ingredient-unit"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Unit
              </label>
              <Input
                id="ingredient-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., cups, tbsp"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-md bg-lavender-light p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Preview:</p>
            <code className="text-sm font-mono text-lavender">{preview}</code>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={!name.trim()}>
              Insert
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
