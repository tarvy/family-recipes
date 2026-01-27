import Link from 'next/link';
import { Suspense } from 'react';
import { getAllRecipes } from '@/lib/recipes/loader';
import { ShoppingListClient } from './shopping-list-client';

export const metadata = {
  title: 'Shopping List | Family Recipes',
  description: 'Create a shopping list from your favorite recipes',
};

/**
 * Loading skeleton for the shopping list
 */
function ShoppingListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Recipe selector skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-pink-light" />
      <div className="space-y-2">
        <div className="h-16 animate-pulse rounded-lg bg-pink-light" />
        <div className="h-16 animate-pulse rounded-lg bg-pink-light" />
      </div>
      {/* Shopping list skeleton */}
      <div className="h-8 animate-pulse rounded-lg bg-pink-light" />
      <div className="space-y-2">
        <div className="h-24 animate-pulse rounded-lg bg-pink-light" />
        <div className="h-24 animate-pulse rounded-lg bg-pink-light" />
        <div className="h-24 animate-pulse rounded-lg bg-pink-light" />
      </div>
    </div>
  );
}

/**
 * Server component that loads recipes and renders the client component
 */
async function ShoppingListContent() {
  const recipes = await getAllRecipes();

  return <ShoppingListClient recipes={recipes} />;
}

export default function ShoppingListPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to recipes
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Shopping List</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select recipes to create a shopping list with aggregated ingredients
          </p>
        </div>

        <Suspense fallback={<ShoppingListSkeleton />}>
          <ShoppingListContent />
        </Suspense>
      </div>
    </main>
  );
}
