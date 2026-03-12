import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { MainLayout } from '@/components/layout';
import { HomeWidget } from '@/components/menu/home-widget';
import { RecipeBrowser } from '@/components/recipes/recipe-browser';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies } from '@/lib/auth/session';
import { findByWeek } from '@/lib/menu/repository';
import { getCurrentWeekLabel } from '@/lib/menu/week-utils';
import {
  getAllRecipes,
  getCategories,
  getRecipeSections,
  RANDOM_RECIPES_COOKIE_NAME,
} from '@/lib/recipes/loader';

/** Skeleton pill keys for loading state */
const SKELETON_PILLS = ['pill-1', 'pill-2', 'pill-3', 'pill-4', 'pill-5'] as const;

/** Skeleton card keys for loading state */
const SKELETON_CARDS = [
  'card-1',
  'card-2',
  'card-3',
  'card-4',
  'card-5',
  'card-6',
  'card-7',
  'card-8',
] as const;

const UTC_SUNDAY_INDEX = 0;
const MONDAY_INDEX_FOR_SUNDAY = 6;
const UTC_TO_MONDAY_OFFSET = 1;

export const metadata = {
  title: 'Recipes | Family Recipes',
  description: 'Browse our collection of family recipes',
};

/**
 * Loading fallback for the recipe browser
 */
function RecipeBrowserSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-pink-light" />
      {/* Category pills skeleton */}
      <div className="flex gap-2">
        {SKELETON_PILLS.map((key) => (
          <div key={key} className="h-8 w-20 animate-pulse rounded-full bg-pink-light" />
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SKELETON_CARDS.map((key) => (
          <div key={key} className="h-64 animate-pulse rounded-lg bg-pink-light" />
        ))}
      </div>
    </div>
  );
}

/**
 * Parse random recipe slugs from cookie value.
 * Returns null if the value is missing, malformed, or not a string array.
 */
function parseRandomSlugs(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
      return parsed as string[];
    }
    return null;
  } catch {
    return null;
  }
}

export default async function RecipesPage() {
  const cookieStore = await cookies();
  const randomCookie = cookieStore.get(RANDOM_RECIPES_COOKIE_NAME)?.value ?? null;
  const cachedSlugs = randomCookie ? parseRandomSlugs(randomCookie) : null;
  const needsRandomCookie = cachedSlugs === null;

  const [recipes, sections] = await Promise.all([getAllRecipes(), getRecipeSections(cachedSlugs)]);
  const categories = getCategories();
  const user = await getSessionFromCookies(cookieStore);
  const currentWeekLabel = getCurrentWeekLabel();
  const menu = user ? await findByWeek(user.id, currentWeekLabel) : null;

  const slugByTitle = new Map(recipes.map((recipe) => [recipe.title, recipe.slug]));
  const widgetAssignments =
    menu?.status === 'locked-in'
      ? menu.assignments.map((assignment) => {
          const recipeSlug = slugByTitle.get(assignment.title);

          return {
            _id: `${assignment.day}-${assignment.mealSlot}-${assignment.title}`,
            title: assignment.title,
            day: assignment.day,
            mealSlot: assignment.mealSlot,
            ...(assignment.thumbnailUrl ? { thumbnailUrl: assignment.thumbnailUrl } : {}),
            ...(recipeSlug ? { recipeSlug } : {}),
          };
        })
      : [];

  const utcDay = new Date().getUTCDay();
  const todayIndex =
    utcDay === UTC_SUNDAY_INDEX ? MONDAY_INDEX_FOR_SUNDAY : utcDay - UTC_TO_MONDAY_OFFSET;

  const canDelete = user?.role === 'owner';
  const isFamily = user ? isFamilyRole(user.role) : false;

  return (
    <MainLayout isFamily={isFamily}>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          {menu?.status === 'locked-in' ? (
            <HomeWidget assignments={widgetAssignments} todayIndex={todayIndex} />
          ) : null}

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Recipes</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse {recipes.length} family recipes
            </p>
          </div>

          <Suspense fallback={<RecipeBrowserSkeleton />}>
            <RecipeBrowser
              recipes={recipes}
              categories={categories}
              canDelete={canDelete}
              isFamily={isFamily}
              sections={sections}
              needsRandomCookie={needsRandomCookie}
            />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  );
}
