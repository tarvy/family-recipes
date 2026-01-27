import Link from 'next/link';
import { Suspense } from 'react';
import { RecipeBrowser } from '@/components/recipes/recipe-browser';
import { getAllRecipes, getCategories } from '@/lib/recipes/loader';

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
      <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
      {/* Category pills skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-200" />
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default async function RecipesPage() {
  const recipes = await getAllRecipes();
  const categories = getCategories();

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Recipes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse {recipes.length} family recipes
          </p>
        </div>

        <Suspense fallback={<RecipeBrowserSkeleton />}>
          <RecipeBrowser recipes={recipes} categories={categories} />
        </Suspense>
      </div>
    </main>
  );
}
