import { Suspense } from 'react';
import { MainLayout } from '@/components/layout';
import { RecipeBrowser } from '@/components/recipes/recipe-browser';
import { getAllRecipes, getCategories } from '@/lib/recipes/loader';

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

export default async function RecipesPage() {
  const recipes = await getAllRecipes();
  const categories = getCategories();

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Recipes</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse {recipes.length} family recipes
            </p>
          </div>

          <Suspense fallback={<RecipeBrowserSkeleton />}>
            <RecipeBrowser recipes={recipes} categories={categories} />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  );
}
