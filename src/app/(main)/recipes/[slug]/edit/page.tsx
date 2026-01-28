/**
 * Edit recipe page
 *
 * Authentication handled by (main) layout. Loads existing recipe data for editing.
 */

import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import {
  createEmptyFormData,
  RecipeForm,
  type RecipeFormData,
} from '@/components/recipes/recipe-form';
import { getRecipeBySlug, type RecipeDetail } from '@/lib/recipes/loader';

interface EditRecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EditRecipePageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found | Family Recipes' };
  }

  return {
    title: `Edit ${recipe.title} | Family Recipes`,
    description: `Edit the ${recipe.title} recipe`,
  };
}

/** Counter for generating unique IDs */
let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Convert RecipeDetail to RecipeFormData
 */
function recipeToFormData(recipe: RecipeDetail): RecipeFormData {
  const base = createEmptyFormData();

  return {
    ...base,
    title: recipe.title,
    category: recipe.category,
    description: recipe.description ?? '',
    servings: recipe.servings?.toString() ?? '',
    prepTime: recipe.prepTime?.toString() ?? '',
    cookTime: recipe.cookTime?.toString() ?? '',
    difficulty: recipe.difficulty ?? '',
    cuisine: recipe.cuisine ?? '',
    course: recipe.course ?? '',
    tags: recipe.tags.join(', '),
    ingredients: recipe.ingredients.map((ing) => ({
      id: generateId('ing'),
      name: ing.name,
      quantity: ing.quantity ?? '',
      unit: ing.unit ?? '',
    })),
    cookware:
      recipe.cookware.length > 0
        ? recipe.cookware.map((cw) => ({
            id: generateId('cw'),
            name: cw.name,
            quantity: cw.quantity?.toString() ?? '',
          }))
        : [{ id: generateId('cw'), name: '', quantity: '' }],
    steps: recipe.steps.map((step) => ({ id: generateId('step'), text: step.text })),
  };
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const formData = recipeToFormData(recipe);

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Edit Recipe</h1>
            <p className="mt-2 text-muted-foreground">Update {recipe.title}</p>
          </header>

          <RecipeForm mode="edit" slug={slug} initialData={formData} />
        </div>
      </div>
    </MainLayout>
  );
}
