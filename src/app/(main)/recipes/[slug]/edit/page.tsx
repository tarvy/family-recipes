/**
 * Edit recipe page
 *
 * Authentication handled by (main) layout.
 * Loads raw Cooklang content for editing in the Cooklang-first editor.
 */

import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { RecipeEditorForm } from '@/components/recipes/recipe-editor-form';
import { getRawCooklangContent as getFromLoader } from '@/lib/recipes/loader';
import { getRawCooklangContent as getFromRepository } from '@/lib/recipes/repository';

interface EditRecipePageProps {
  params: Promise<{ slug: string }>;
}

/** Load raw Cooklang content: MongoDB first, then file-based loader fallback. */
async function loadRawCooklangContent(
  slug: string,
): Promise<{ content: string; category: string; slug: string } | null> {
  const fromDb = await getFromRepository(slug);
  if (fromDb) {
    return fromDb;
  }
  return getFromLoader(slug);
}

export async function generateMetadata({ params }: EditRecipePageProps) {
  const { slug } = await params;
  const recipe = await loadRawCooklangContent(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found | Family Recipes' };
  }

  // Extract title from content for metadata
  const titleMatch = recipe.content.match(/^>>\s*title:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() || slug;

  return {
    title: `Edit ${title} | Family Recipes`,
    description: `Edit the ${title} recipe`,
  };
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { slug } = await params;
  const recipe = await loadRawCooklangContent(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Edit Recipe</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit your recipe using Cooklang syntax. Changes are saved as raw Cooklang.
            </p>
          </header>

          <RecipeEditorForm
            mode="edit"
            slug={slug}
            initialContent={recipe.content}
            initialCategory={recipe.category}
          />
        </div>
      </div>
    </MainLayout>
  );
}
