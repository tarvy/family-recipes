/**
 * Create new recipe page
 *
 * Requires authentication. Redirects to login if not authenticated.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { RecipeForm } from '@/components/recipes/recipe-form';
import { getSessionFromCookies } from '@/lib/auth/session';

export const metadata = {
  title: 'Create Recipe | Family Recipes',
  description: 'Add a new recipe to your family collection',
};

export default async function CreateRecipePage() {
  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);

  if (!user) {
    redirect('/login?returnTo=/recipes/new');
  }

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Create New Recipe</h1>
            <p className="mt-2 text-muted-foreground">Add a new recipe to your family collection</p>
          </header>

          <RecipeForm mode="create" />
        </div>
      </div>
    </MainLayout>
  );
}
