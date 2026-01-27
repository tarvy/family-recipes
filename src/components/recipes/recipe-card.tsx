import Link from 'next/link';
import type { RecipePreview } from '@/lib/recipes/loader';

/**
 * Category color configuration
 * Maps category names to Tailwind background and text colors
 */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  entrees: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    badge: 'bg-blue-200 text-blue-800',
  },
  desserts: {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    badge: 'bg-pink-200 text-pink-800',
  },
  soups: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    badge: 'bg-orange-200 text-orange-800',
  },
  sides: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    badge: 'bg-green-200 text-green-800',
  },
  salads: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    badge: 'bg-emerald-200 text-emerald-800',
  },
  breakfast: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    badge: 'bg-yellow-200 text-yellow-800',
  },
};

const DEFAULT_COLORS = {
  bg: 'bg-gray-100',
  text: 'text-gray-800',
  badge: 'bg-gray-200 text-gray-800',
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
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
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
 */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const colors = getCategoryColors(recipe.category);

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block rounded-lg shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Colored placeholder header */}
      <div
        className={`flex h-32 items-center justify-center rounded-t-lg ${colors.bg}`}
        aria-hidden="true"
      >
        <span className={`text-4xl font-bold opacity-30 ${colors.text}`}>
          {recipe.title.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Card content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-blue-600">
          {recipe.title}
        </h3>

        {/* Category badge */}
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}
        >
          {formatCategory(recipe.category)}
        </span>

        {/* Meta information */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
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
