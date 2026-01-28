/**
 * Create new recipe page
 *
 * Authentication handled by (main) layout.
 */

import { MainLayout } from '@/components/layout';
import { RecipeForm } from '@/components/recipes/recipe-form';

export const metadata = {
  title: 'Create Recipe | Family Recipes',
  description: 'Add a new recipe to your family collection',
};

export default async function CreateRecipePage() {
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
