'use client';

import { useState } from 'react';
import type { RecipeDetail } from '@/lib/recipes/loader';
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
 */
export function RecipeDetailClient({ recipe, cookwareSection }: RecipeDetailClientProps) {
  const [multiplier, setMultiplier] = useState(1);

  return (
    <RecipeContentLayout
      ingredientPanel={
        <>
          {/* Ingredients */}
          <section>
            <h2 className="text-xl font-semibold text-foreground">Ingredients</h2>
            <div className="mt-4 rounded-lg bg-card-nested p-5 ring-1 ring-border">
              <ScalableIngredientList
                ingredients={recipe.ingredients}
                defaultServings={recipe.servings}
                multiplier={multiplier}
                onMultiplierChange={setMultiplier}
              />
            </div>
          </section>

          {/* Cookware */}
          {cookwareSection}
        </>
      }
      instructionsPanel={
        <section>
          <h2 className="text-xl font-semibold text-foreground">Instructions</h2>
          <div className="mt-4">
            <InteractiveStepList
              steps={recipe.steps}
              ingredients={recipe.ingredients}
              multiplier={multiplier}
            />
          </div>
        </section>
      }
    />
  );
}
