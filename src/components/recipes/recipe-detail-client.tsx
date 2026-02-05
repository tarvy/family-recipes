'use client';

/**
 * Recipe Detail Client Component
 *
 * Client component wrapper for recipe detail content with state management.
 */

import { useState } from 'react';
import { useCookingSession } from '@/components/cooking-session';
import type { RecipeDetail } from '@/lib/recipes/repository';
import { InteractiveStepList } from './interactive-step-list';
import { RecipeContentLayout } from './recipe-content-layout';
import { ScalableIngredientList } from './scalable-ingredient-list';

interface RecipeDetailClientProps {
  recipe: RecipeDetail;
  /** Cookware section to render in the ingredient panel */
  cookwareSection?: React.ReactNode;
}

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/**
 * Pin icon (unfilled)
 */
function PinIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

/**
 * Pin icon (filled)
 */
function PinFilledIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

/**
 * Client component wrapper for recipe detail content.
 *
 * Manages shared state between ingredients and steps:
 * - Multiplier for scaling quantities
 * - Active ingredient for tooltip display
 * - Pin state for cooking session
 */
export function RecipeDetailClient({ recipe, cookwareSection }: RecipeDetailClientProps) {
  const [multiplier, setMultiplier] = useState(1);
  const { isPinned, pinRecipe, unpinRecipe } = useCookingSession();

  const isRecipePinned = isPinned(recipe.slug);

  const handlePinToggle = () => {
    if (isRecipePinned) {
      unpinRecipe(recipe.slug);
    } else {
      pinRecipe(recipe.slug, recipe.title);
    }
  };

  return (
    <RecipeContentLayout
      ingredientPanel={
        <div className="flex h-full flex-col">
          {/* Pin button */}
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={handlePinToggle}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-pink ${
                isRecipePinned
                  ? 'bg-lavender text-white hover:bg-lavender/90'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
              aria-pressed={isRecipePinned}
            >
              {isRecipePinned ? <PinFilledIcon /> : <PinIcon />}
              {isRecipePinned ? 'Pinned' : 'Pin Recipe'}
            </button>
          </div>

          {/* Ingredients - takes remaining space with internal scroll */}
          <section className="flex min-h-0 flex-1 flex-col">
            <h2 className="shrink-0 text-xl font-semibold text-foreground">Ingredients</h2>
            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-card-nested p-5 ring-1 ring-border">
              <ScalableIngredientList
                ingredients={recipe.ingredients}
                defaultServings={recipe.servings}
                multiplier={multiplier}
                onMultiplierChange={setMultiplier}
              />
            </div>
          </section>

          {/* Cookware - shrinks to fit */}
          {cookwareSection && <div className="shrink-0">{cookwareSection}</div>}
        </div>
      }
      instructionsPanel={
        <section>
          <h2 className="text-xl font-semibold text-foreground">Instructions</h2>
          <div className="mt-4">
            <InteractiveStepList
              steps={recipe.steps}
              ingredients={recipe.ingredients}
              multiplier={multiplier}
              recipeSlug={recipe.slug}
              recipeTitle={recipe.title}
            />
          </div>
        </section>
      }
    />
  );
}
