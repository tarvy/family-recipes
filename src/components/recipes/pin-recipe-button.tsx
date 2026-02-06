/**
 * Pin recipe button for recipe detail pages.
 *
 * Toggles a recipe's pinned state in the cooking session context.
 * Styled to match the Edit button in the recipe detail action bar.
 */

'use client';

import { useCallback } from 'react';
import { useCookingSession } from '@/components/cooking-session';

/** SVG icon stroke width */
const ICON_STROKE_WIDTH = 2;

interface PinRecipeButtonProps {
  /** Recipe slug for pin association */
  recipeSlug: string;
  /** Recipe title shown in pinned list */
  recipeTitle: string;
}

export function PinRecipeButton({ recipeSlug, recipeTitle }: PinRecipeButtonProps) {
  const { isPinned, pinRecipe, unpinRecipe } = useCookingSession();

  const pinned = isPinned(recipeSlug);

  const handleToggle = useCallback(() => {
    if (pinned) {
      unpinRecipe(recipeSlug);
    } else {
      pinRecipe(recipeSlug, recipeTitle);
    }
  }, [pinned, recipeSlug, recipeTitle, pinRecipe, unpinRecipe]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={pinned}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-medium ${
        pinned
          ? 'border-lavender text-lavender hover:border-lavender/70 hover:text-lavender/70'
          : 'border-border text-muted-foreground hover:border-lavender hover:text-lavender'
      }`}
    >
      {pinned ? <PinFilledIcon className="h-4 w-4" /> : <PinIcon className="h-4 w-4" />}
      {pinned ? 'Pinned' : 'Pin Recipe'}
    </button>
  );
}

function PinIcon({ className }: { className?: string }) {
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
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

function PinFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}
