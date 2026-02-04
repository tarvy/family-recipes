import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { RecipeDetailClient } from '@/components/recipes/recipe-detail-client';
import { Card } from '@/components/ui';
import { MINUTES_PER_HOUR } from '@/lib/constants/time';
import { getRecipeBySlug } from '@/lib/recipes/loader';

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RecipeDetailPageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found | Family Recipes' };
  }

  return {
    title: `${recipe.title} | Family Recipes`,
    description: recipe.description ?? `Learn how to make ${recipe.title}`,
  };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  return (
    <MainLayout>
      <div className="px-6 py-6">
        <Card className="relative mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl p-6 sm:p-8">
          {/* Edit button — top right */}
          <Link
            href={`/recipes/${slug}/edit`}
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted-foreground hover:border-lavender hover:text-lavender sm:right-6 sm:top-6"
          >
            <EditIcon className="h-4 w-4" />
            Edit
          </Link>

          {/* Header */}
          <header>
            <h1 className="pr-20 text-3xl font-semibold text-foreground">{recipe.title}</h1>

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
            </div>

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
          {(recipe.cuisine || recipe.course || recipe.difficulty) && (
            <footer className="mt-10 border-t border-border pt-6">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {recipe.cuisine && <span>Cuisine: {recipe.cuisine}</span>}
                {recipe.course && <span>Course: {recipe.course}</span>}
                {recipe.difficulty && <span>Difficulty: {recipe.difficulty}</span>}
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
 * Clock icon
 */
function ClockIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
    </svg>
  );
}

/**
 * Servings/people icon
 */
function ServingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

/**
 * Edit/pencil icon
 */
function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}
