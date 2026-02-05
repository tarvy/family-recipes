'use client';

/**
 * Interactive Step List Component
 *
 * Displays recipe instructions with clickable timer badges and tappable ingredient references.
 */

import { useCallback, useState } from 'react';
import { TimerBadge } from '@/components/cooking-session';
import { IngredientTooltip } from './ingredient-tooltip';

interface Timer {
  duration: number;
  unit: string;
}

interface StepIngredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface Step {
  text: string;
  timers?: Timer[];
  ingredients?: StepIngredient[];
}

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface InteractiveStepListProps {
  steps: Step[];
  /** Full ingredient list for looking up measurements */
  ingredients: Ingredient[];
  /** Current multiplier for scaling quantities */
  multiplier: number;
  /** Recipe slug for timer tracking */
  recipeSlug: string;
  /** Recipe title for timer display */
  recipeTitle: string;
}

/** Characters to include in step key for uniqueness */
const STEP_KEY_SLICE_LENGTH = 20;

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the full ingredient from the main list by name
 */
function findIngredientByName(name: string, ingredients: Ingredient[]): Ingredient | undefined {
  const lowerName = name.toLowerCase();
  return ingredients.find((ing) => ing.name.toLowerCase() === lowerName);
}

/**
 * Parse step text and wrap ingredient names in interactive triggers.
 *
 * Uses the step's embedded ingredients array to identify which words
 * should be interactive.
 */
function parseStepWithIngredients(
  stepText: string,
  stepIngredients: StepIngredient[] | undefined,
  allIngredients: Ingredient[],
  multiplier: number,
  activeIngredient: string | null,
  onIngredientClick: (name: string) => void,
): React.ReactNode {
  if (!stepIngredients || stepIngredients.length === 0) {
    return stepText;
  }

  // Build regex pattern from ingredient names (longest first to avoid partial matches)
  const sortedNames = [...stepIngredients].map((i) => i.name).sort((a, b) => b.length - a.length);

  const pattern = new RegExp(`\\b(${sortedNames.map(escapeRegex).join('|')})\\b`, 'gi');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Reset lastIndex for global regex
  pattern.lastIndex = 0;

  for (let match = pattern.exec(stepText); match !== null; match = pattern.exec(stepText)) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(stepText.slice(lastIndex, match.index));
    }

    const matchedText = match[0];
    const ingredientName = match[1];

    // Skip if no ingredient name captured
    if (!ingredientName) {
      parts.push(matchedText);
      lastIndex = match.index + matchedText.length;
      continue;
    }

    // Find the full ingredient with quantity from the main list
    const fullIngredient = findIngredientByName(ingredientName, allIngredients);

    if (fullIngredient) {
      const isActive = activeIngredient === ingredientName.toLowerCase();

      parts.push(
        <IngredientTrigger
          key={`${match.index}-${ingredientName}`}
          displayText={matchedText}
          ingredient={fullIngredient}
          multiplier={multiplier}
          isActive={isActive}
          onClick={() => onIngredientClick(ingredientName.toLowerCase())}
        />,
      );
    } else {
      // No matching ingredient found, just render the text
      parts.push(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text
  if (lastIndex < stepText.length) {
    parts.push(stepText.slice(lastIndex));
  }

  return parts;
}

interface IngredientTriggerProps {
  displayText: string;
  ingredient: Ingredient;
  multiplier: number;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Tappable ingredient name within step text.
 *
 * Shows tooltip with full measurement on click/tap.
 */
function IngredientTrigger({
  displayText,
  ingredient,
  multiplier,
  isActive,
  onClick,
}: IngredientTriggerProps) {
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isActive}
        className={`
          cursor-pointer underline decoration-pink decoration-dotted underline-offset-2
          hover:decoration-solid hover:text-pink
          focus:outline-none focus:ring-2 focus:ring-pink focus:ring-offset-1 focus:rounded
          ${isActive ? 'text-pink decoration-solid' : ''}
        `}
      >
        {displayText}
      </button>
      <IngredientTooltip
        ingredient={ingredient}
        multiplier={multiplier}
        isOpen={isActive}
        onClose={() => {}}
      />
    </span>
  );
}

/**
 * Create a stable key for a step
 */
function createStepKey(step: Step, index: number): string {
  return `step-${index}-${step.text.slice(0, STEP_KEY_SLICE_LENGTH).replace(/\s+/g, '-')}`;
}

/**
 * Create a stable key for a timer
 */
function createTimerKey(timer: Timer, stepIndex: number): string {
  return `timer-${stepIndex}-${timer.duration}-${timer.unit}`;
}

/**
 * Interactive step list with tappable ingredient references.
 *
 * Features:
 * - Numbered steps with decorative styling
 * - Clickable timer badges that start countdowns
 * - Tappable ingredient names that show tooltips with measurements
 * - Scaled quantities based on current multiplier
 */
export function InteractiveStepList({
  steps,
  ingredients,
  multiplier,
  recipeSlug,
  recipeTitle,
}: InteractiveStepListProps) {
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null);

  const handleIngredientClick = useCallback((name: string) => {
    setActiveIngredient((prev) => (prev === name ? null : name));
  }, []);

  if (steps.length === 0) {
    return (
      <p className="text-muted-foreground italic">No instructions available for this recipe.</p>
    );
  }

  return (
    <ol className="space-y-6">
      {steps.map((step, index) => (
        <li key={createStepKey(step, index)} className="flex gap-4">
          {/* Step number */}
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lavender text-sm font-semibold text-white">
            {index + 1}
          </span>

          {/* Step content */}
          <div className="flex-1 pt-1">
            <p className="text-foreground leading-relaxed">
              {parseStepWithIngredients(
                step.text,
                step.ingredients,
                ingredients,
                multiplier,
                activeIngredient,
                handleIngredientClick,
              )}
            </p>

            {/* Timer badges */}
            {step.timers && step.timers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {step.timers.map((timer) => (
                  <TimerBadge
                    key={createTimerKey(timer, index)}
                    timer={timer}
                    recipeSlug={recipeSlug}
                    recipeTitle={recipeTitle}
                    stepIndex={index}
                    stepText={step.text}
                  />
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
