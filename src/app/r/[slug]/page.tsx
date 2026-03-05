/**
 * Public recipe page — read-only, no auth, no interactive features.
 *
 * Security: This page must NEVER read cookies, check sessions, or expose
 * user data. It renders a stripped-down recipe view for anonymous sharing.
 */

import { notFound } from 'next/navigation';
import { MINUTES_PER_HOUR } from '@/lib/constants/time';
import { formatUpdatedDate } from '@/lib/format/date';
import type { RecipeDetail } from '@/lib/recipes/repository';
import { getRecipeDetail } from '@/lib/recipes/repository';

interface PublicRecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublicRecipePageProps) {
  const { slug } = await params;
  const recipe = await getRecipeDetail(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found' };
  }

  return {
    title: recipe.title,
    description: recipe.description ?? `Learn how to make ${recipe.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicRecipePage({ params }: PublicRecipePageProps) {
  const { slug } = await params;
  const recipe = await getRecipeDetail(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <PublicRecipeHeader recipe={recipe} />
          <PublicIngredientsList recipe={recipe} />
          <PublicCookwareList recipe={recipe} />
          <PublicStepsList recipe={recipe} />
          <PublicRecipeFooter recipe={recipe} />
        </article>
      </div>
    </div>
  );
}

function PublicRecipeHeader({ recipe }: { recipe: RecipeDetail }) {
  return (
    <header>
      <h1 className="text-3xl font-semibold text-foreground">{recipe.title}</h1>

      <div className="mt-3">
        <span className="rounded-full bg-pink px-3 py-1 text-sm font-medium capitalize text-foreground">
          {recipe.category}
        </span>
      </div>

      {recipe.description && <p className="mt-4 text-muted-foreground">{recipe.description}</p>}

      <PublicMetaRow recipe={recipe} />

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-yellow-light px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

function PublicMetaRow({ recipe }: { recipe: RecipeDetail }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {recipe.prepTime !== undefined && <span>Prep: {formatTime(recipe.prepTime)}</span>}
      {recipe.cookTime !== undefined && <span>Cook: {formatTime(recipe.cookTime)}</span>}
      {recipe.totalTime !== undefined && <span>Total: {formatTime(recipe.totalTime)}</span>}
      {recipe.servings !== undefined && (
        <span>
          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function PublicIngredientsList({ recipe }: { recipe: RecipeDetail }) {
  if (recipe.ingredients.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">Ingredients</h2>
      <ul className="mt-4 space-y-2">
        {recipe.ingredients.map((ingredient) => {
          const key = `${ingredient.name}-${ingredient.quantity ?? ''}-${ingredient.unit ?? ''}`;
          return (
            <li key={key} className="flex items-baseline gap-2 text-foreground">
              <span className="text-muted-foreground">
                {ingredient.quantity}
                {ingredient.unit ? ` ${ingredient.unit}` : ''}
              </span>
              <span>{ingredient.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PublicCookwareList({ recipe }: { recipe: RecipeDetail }) {
  if (recipe.cookware.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">Equipment</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {recipe.cookware.map((item) => (
          <span
            key={`${item.name}-${item.quantity ?? 1}`}
            className="rounded-full bg-lavender-light px-3 py-1 text-sm text-foreground"
          >
            {item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
}

function PublicStepsList({ recipe }: { recipe: RecipeDetail }) {
  if (recipe.steps.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">Instructions</h2>
      <ol className="mt-4 space-y-4">
        {recipe.steps.map((step, index) => (
          <li key={`step-${index.toString()}`} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink text-sm font-medium text-foreground">
              {index + 1}
            </span>
            <p className="pt-0.5 text-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PublicRecipeFooter({ recipe }: { recipe: RecipeDetail }) {
  const hasFooterMeta = recipe.cuisine || recipe.course || recipe.difficulty || recipe.updatedAt;

  if (!hasFooterMeta) {
    return null;
  }

  return (
    <footer className="mt-10 border-t border-border pt-6">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {recipe.cuisine && <span>Cuisine: {recipe.cuisine}</span>}
        {recipe.course && <span>Course: {recipe.course}</span>}
        {recipe.difficulty && <span>Difficulty: {recipe.difficulty}</span>}
        {recipe.updatedAt && <span>Last updated: {formatUpdatedDate(recipe.updatedAt)}</span>}
      </div>
    </footer>
  );
}

function formatTime(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainingMinutes = minutes % MINUTES_PER_HOUR;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}
