'use client';

/**
 * Pinned Recipe Item Component
 *
 * Displays a pinned recipe with link and unpin button.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

import { useCookingSession } from './cooking-session-context';
import type { PinnedRecipe } from './types';

interface PinnedRecipeItemProps {
  recipe: PinnedRecipe;
}

/**
 * X icon for unpin
 */
function XIcon(): ReactNode {
  return (
    <svg
      className="h-3 w-3"
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

/**
 * Compact pinned recipe chip with link and unpin button
 */
export function PinnedRecipeItem({ recipe }: PinnedRecipeItemProps): ReactNode {
  const { unpinRecipe } = useCookingSession();

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-lavender/20 py-1 pl-3 pr-1 text-sm">
      <Link
        href={`/recipes/${recipe.slug}`}
        className="text-foreground hover:text-pink hover:underline"
      >
        {recipe.title}
      </Link>
      <button
        type="button"
        onClick={() => unpinRecipe(recipe.slug)}
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-pink"
        aria-label={`Unpin ${recipe.title}`}
      >
        <XIcon />
      </button>
    </div>
  );
}
