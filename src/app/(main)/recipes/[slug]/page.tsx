import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { CalendarIcon, ClockIcon, ServingsIcon } from '@/components/media/icons';
import { RecipeActions } from '@/components/recipes/recipe-actions';
import { RecipeBackButton } from '@/components/recipes/recipe-back-button';
import { RecipeDetailClient } from '@/components/recipes/recipe-detail-client';
import { Card } from '@/components/ui';
import { getSessionFromCookies } from '@/lib/auth/session';
import { MINUTES_PER_HOUR } from '@/lib/constants/time';
import { formatUpdatedDate } from '@/lib/format/date';
import { getRecipeBySlug } from '@/lib/recipes/loader';
import type { RecipeDetail } from '@/lib/recipes/repository';
import { getRecipeDetail } from '@/lib/recipes/repository';

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

/** Load recipe for detail page: MongoDB first, then file-based loader fallback. */
async function loadRecipeDetail(slug: string): Promise<RecipeDetail | null> {
  const fromDb = await getRecipeDetail(slug);
  if (fromDb) {
    return fromDb;
  }
  const fromLoader = await getRecipeBySlug(slug);
  return fromLoader as RecipeDetail | null;
}

export async function generateMetadata({ params }: RecipeDetailPageProps) {
  const { slug } = await params;
  const recipe = await loadRecipeDetail(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found | Family Recipes' };
  }

  return {
    title: `${recipe.title} | Family Recipes`,
    description: recipe.description ?? `Learn how to make ${recipe.title}`,
  };
}

export default async function RecipeDetailPage({ params, searchParams }: RecipeDetailPageProps) {
  const { slug } = await params;
  const [recipe, cookieStore, resolvedSearchParams] = await Promise.all([
    loadRecipeDetail(slug),
    cookies(),
    searchParams,
  ]);

  if (!recipe) {
    notFound();
  }

  const user = await getSessionFromCookies(cookieStore);
  const canDelete = user?.role === 'owner' || user?.role === 'family';
  const showBack = resolvedSearchParams.from === 'browse';

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <Card className="relative mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl p-6 sm:p-8">
          {/* Back button — top left (only from browse) */}
          {showBack && (
            <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
              <RecipeBackButton />
            </div>
          )}

          {/* Action menu — top right */}
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <RecipeActions slug={slug} recipeTitle={recipe.title} canDelete={canDelete} />
          </div>

          {/* Header */}
          <header>
            <h1 className="pr-10 text-3xl font-semibold text-foreground">{recipe.title}</h1>

            {/* Category badge */}
            <div className="mt-3">
              <span className="rounded-full bg-pink px-3 py-1 text-sm font-medium capitalize text-foreground">
                {recipe.category}
              </span>
            </div>

            {/* Description */}
            {recipe.description && (
              <p className="mt-4 text-muted-foreground">{recipe.description}</p>
            )}

            {/* Meta info */}
            <RecipeMetaRow recipe={recipe} />

            {/* Tags */}
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

          {/* Recipe Content: Responsive two-column layout in landscape */}
          <div className="mt-10">
            <RecipeDetailClient
              recipe={recipe}
              cookwareSection={
                recipe.cookware.length > 0 ? (
                  <section className="mt-8">
                    <h2 className="text-xl font-semibold text-foreground">Equipment</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recipe.cookware.map((item) => (
                        <span
                          key={`${item.name}-${item.quantity ?? 1}`}
                          className="rounded-full bg-lavender-light px-3 py-1 text-sm text-foreground"
                        >
                          {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : undefined
              }
            />
          </div>

          {/* Footer meta */}
          {(recipe.cuisine || recipe.course || recipe.difficulty || recipe.updatedAt) && (
            <footer className="mt-10 border-t border-border pt-6">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {recipe.cuisine && <span>Cuisine: {recipe.cuisine}</span>}
                {recipe.course && <span>Course: {recipe.course}</span>}
                {recipe.difficulty && <span>Difficulty: {recipe.difficulty}</span>}
                {recipe.updatedAt && (
                  <span>Last updated: {formatUpdatedDate(recipe.updatedAt)}</span>
                )}
              </div>
            </footer>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}

/**
 * Format time display (e.g., "30 min" or "1 hr 15 min")
 */
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

/**
 * Meta info row showing times, servings, and updated date
 */
function RecipeMetaRow({ recipe }: { recipe: RecipeDetail }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {recipe.prepTime !== undefined && (
        <span className="flex items-center gap-1">
          <ClockIcon />
          Prep: {formatTime(recipe.prepTime)}
        </span>
      )}
      {recipe.cookTime !== undefined && (
        <span className="flex items-center gap-1">
          <ClockIcon />
          Cook: {formatTime(recipe.cookTime)}
        </span>
      )}
      {recipe.totalTime !== undefined && (
        <span className="flex items-center gap-1">
          <ClockIcon />
          Total: {formatTime(recipe.totalTime)}
        </span>
      )}
      {recipe.servings !== undefined && (
        <span className="flex items-center gap-1">
          <ServingsIcon />
          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
        </span>
      )}
      {recipe.updatedAt && (
        <span className="flex items-center gap-1">
          <CalendarIcon />
          Updated {formatUpdatedDate(recipe.updatedAt)}
        </span>
      )}
    </div>
  );
}
