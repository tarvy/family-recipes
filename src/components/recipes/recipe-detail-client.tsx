'use client';

/**
 * Recipe Detail Client Component
 *
 * Client component wrapper for recipe detail content with state management.
 */

import { useState } from 'react';
import type { RecipeDetail } from '@/lib/recipes/repository';
import { InteractiveStepList } from './interactive-step-list';
import { RecipeContentLayout } from './recipe-content-layout';
import { ScalableIngredientList } from './scalable-ingredient-list';

interface RecipeDetailClientProps {
  recipe: RecipeDetail;
  /** Cookware section to render in the ingredient panel */
  cookwareSection?: React.ReactNode;
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

  return (
    <RecipeContentLayout
      ingredientPanel={
        <div className="flex h-full flex-col">
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
