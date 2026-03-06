/**
 * Create new recipe page
 *
 * Authentication handled by (main) layout.
 * Uses the Cooklang-first editor for creating new recipes.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { RecipeEditorForm } from '@/components/recipes/recipe-editor-form';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies } from '@/lib/auth/session';

export const metadata = {
  title: 'Create Recipe | Family Recipes',
  description: 'Add a new recipe to your family collection',
};

export default async function CreateRecipePage() {
  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);

  if (!(user && isFamilyRole(user.role))) {
    redirect('/recipes');
  }

  const isFamily = isFamilyRole(user.role);

  return (
    <MainLayout isFamily={isFamily}>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Create New Recipe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Write your recipe using Cooklang syntax. Use @ for ingredients, # for cookware, ~ for
              timers.
            </p>
          </header>

          <RecipeEditorForm mode="create" />
        </div>
      </div>
    </MainLayout>
  );
}
