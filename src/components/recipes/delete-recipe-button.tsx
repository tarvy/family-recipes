/**
 * Delete recipe button for recipe detail pages.
 *
 * Shows an inline confirmation dropdown before deleting.
 * Styled to match the existing action button bar (Edit, Pin, CoverPhoto).
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TrashIcon } from '@/components/media/icons';

interface DeleteRecipeButtonProps {
  /** Recipe slug used for the DELETE API call */
  recipeSlug: string;
  /** Recipe title shown in the confirmation prompt */
  recipeTitle: string;
}

type DeleteState = 'idle' | 'confirming' | 'deleting' | 'error';

/** Duration in ms to show the error state before reverting to idle */
const ERROR_DISPLAY_MS = 3000;

export function DeleteRecipeButton({ recipeSlug, recipeTitle }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<DeleteState>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close confirmation dropdown when clicking outside
  useEffect(() => {
    if (state !== 'confirming') {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setState('idle');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state]);

  // Auto-dismiss error state
  useEffect(() => {
    if (state !== 'error') {
      return;
    }

    const timer = setTimeout(() => setState('idle'), ERROR_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const handleDelete = useCallback(async () => {
    setState('deleting');

    try {
      const response = await fetch(`/api/recipes/${recipeSlug}`, { method: 'DELETE' });

      if (!response.ok) {
        setState('error');
        return;
      }

      router.push('/recipes');
    } catch {
      setState('error');
    }
  }, [recipeSlug, router]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setState(state === 'confirming' ? 'idle' : 'confirming')}
        disabled={state === 'deleting'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-sm font-medium text-destructive hover:border-destructive/50 hover:text-destructive/80 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        {buttonLabel(state)}
      </button>

      {/* Confirmation dropdown */}
      {state === 'confirming' && (
        <div className="absolute right-0 top-full z-10 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Delete &ldquo;{recipeTitle}&rdquo;?
          </p>
          <div className="flex border-t border-border">
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setState('idle')}
              className="flex-1 border-l border-border px-3 py-2 text-sm text-muted-foreground hover:bg-pink-light"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buttonLabel(state: DeleteState): string {
  switch (state) {
    case 'deleting':
      return 'Deleting...';
    case 'error':
      return 'Failed';
    default:
      return 'Delete';
  }
}
