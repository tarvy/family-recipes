'use client';

/**
 * Recipe Card Component
 *
 * Displays a recipe preview with category colors, time, and ingredient count.
 * Supports long-press/right-click for context menu on mobile/desktop.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  AddToCartIcon,
  ContextMenu,
  type ContextMenuItem,
  EditIcon,
  type LongPressPosition,
  useLongPress,
} from '@/components/gestures';
import type { RecipePreview } from '@/lib/recipes/loader';

/** Minutes per hour for time conversion */
const MINUTES_PER_HOUR = 60;

/**
 * Category color configuration
 * Uses warm, cozy colors that complement the Cooking Mama design system
 */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  entrees: {
    bg: 'bg-pink-light',
    text: 'text-pink-dark',
    badge: 'bg-pink text-foreground',
  },
  desserts: {
    bg: 'bg-lavender-light',
    text: 'text-lavender-dark',
    badge: 'bg-lavender text-white',
  },
  soups: {
    bg: 'bg-yellow-light',
    text: 'text-yellow-dark',
    badge: 'bg-yellow text-foreground',
  },
  sides: {
    bg: 'bg-pink-light',
    text: 'text-pink-dark',
    badge: 'bg-pink-dark text-white',
  },
  salads: {
    bg: 'bg-yellow-light',
    text: 'text-yellow-dark',
    badge: 'bg-yellow-dark text-foreground',
  },
  breakfast: {
    bg: 'bg-yellow-light',
    text: 'text-yellow-dark',
    badge: 'bg-yellow text-foreground',
  },
};

const DEFAULT_COLORS = {
  bg: 'bg-muted',
  text: 'text-muted-foreground',
  badge: 'bg-muted text-muted-foreground',
};

/**
 * Get colors for a category
 */
function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLORS;
}

/**
 * Format time display (e.g., "30 min" or "1 hr 15 min")
 */
function formatTime(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainingMinutes = minutes % MINUTES_PER_HOUR;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format category name for display (capitalize first letter)
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

interface RecipeCardProps {
  recipe: RecipePreview;
}

/**
 * Recipe card component for displaying a recipe preview
 *
 * Features:
 * - Colored placeholder based on category
 * - Category badge
 * - Time information (prep, cook, or total)
 * - Ingredient count
 * - Hover and focus states for accessibility
 * - Long-press/right-click context menu
 */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const router = useRouter();
  const colors = getCategoryColors(recipe.category);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<LongPressPosition>({ x: 0, y: 0 });

  const handleLongPress = useCallback((position: LongPressPosition) => {
    setMenuPosition(position);
    setContextMenuOpen(true);
  }, []);

  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
  });

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'edit',
      label: 'Edit Recipe',
      icon: <EditIcon />,
      onClick: () => {
        router.push(`/recipes/${recipe.slug}/edit`);
      },
    },
    {
      id: 'add-to-list',
      label: 'Add to Shopping List',
      icon: <AddToCartIcon />,
      onClick: () => {
        router.push(`/shopping-list?add=${recipe.slug}`);
      },
    },
  ];

  return (
    <>
      <Link
        href={`/recipes/${recipe.slug}`}
        className="group block overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border transition-all hover:shadow-md hover:ring-pink-dark focus:outline-none focus:ring-2 focus:ring-lavender focus:ring-offset-2"
        {...longPressHandlers}
      >
        {/* Colored placeholder header */}
        <div className={`flex h-32 items-center justify-center ${colors.bg}`} aria-hidden="true">
          <span className={`text-4xl font-bold opacity-40 ${colors.text}`}>
            {recipe.title.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Card content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-lavender-dark">
            {recipe.title}
          </h3>

          {/* Category badge */}
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}
          >
            {formatCategory(recipe.category)}
          </span>

          {/* Meta information */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {recipe.totalTime !== undefined && (
              <span className="flex items-center gap-1">
                <ClockIcon />
                {formatTime(recipe.totalTime)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <IngredientsIcon />
              {recipe.ingredientCount} ingredient{recipe.ingredientCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </Link>

      <ContextMenu
        items={contextMenuItems}
        position={menuPosition}
        isOpen={contextMenuOpen}
        onClose={() => setContextMenuOpen(false)}
      />
    </>
  );
}

/**
 * Simple clock icon
 */
function ClockIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
    </svg>
  );
}

/**
 * Simple ingredients/list icon
 */
function IngredientsIcon() {
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
        strokeWidth="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
