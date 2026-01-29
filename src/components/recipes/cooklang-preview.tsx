'use client';

/**
 * Cooklang preview component
 *
 * Shows a live preview of parsed Cooklang content including:
 * - Rendered recipe steps
 * - Extracted ingredients list
 * - Parse errors if content is invalid
 */

import { useMemo } from 'react';
import type { IIngredient, IStep } from '@/db/types';
import { cn } from '@/lib/utils';

interface ParsedRecipe {
  ingredients: IIngredient[];
  steps: IStep[];
  error?: string;
}

interface CooklangPreviewProps {
  /** Raw Cooklang content (body only, not metadata) */
  content: string;
  /** Additional class names */
  className?: string;
}

/** Regex pattern for Cooklang ingredients */
const INGREDIENT_REGEX = /@([^@#~{}\n]+?)(?:\{([^}]*)\})?(?=\s|$|[.,;!?])/g;

/** Regex match group indices for ingredient pattern */
const MATCH_GROUP_NAME = 1;
const MATCH_GROUP_DETAILS = 2;

/**
 * Parse quantity and unit from ingredient details string
 * Handles formats: "2%cups", "2", or empty
 */
function parseIngredientDetails(details: string | undefined): {
  quantity: string | null;
  unit: string | null;
} {
  if (!details) {
    return { quantity: null, unit: null };
  }

  if (details.includes('%')) {
    const [q, u] = details.split('%');
    return { quantity: q?.trim() || null, unit: u?.trim() || null };
  }

  if (details.trim()) {
    return { quantity: details.trim(), unit: null };
  }

  return { quantity: null, unit: null };
}

/**
 * Create an IIngredient from parsed regex match
 */
function createIngredient(name: string, details: string | undefined): IIngredient {
  const parsed = parseIngredientDetails(details);
  const ingredient: IIngredient = { name };

  if (parsed.quantity !== null) {
    ingredient.quantity = parsed.quantity;
  }
  if (parsed.unit !== null) {
    ingredient.unit = parsed.unit;
  }

  return ingredient;
}

/**
 * Extract all ingredients from a paragraph of Cooklang text
 */
function extractIngredientsFromParagraph(paragraph: string): IIngredient[] {
  const stepIngredients: IIngredient[] = [];
  const regex = new RegExp(INGREDIENT_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
  while ((match = regex.exec(paragraph)) !== null) {
    const name = match[MATCH_GROUP_NAME];
    if (!name) {
      continue;
    }
    const ingredient = createIngredient(name.trim(), match[MATCH_GROUP_DETAILS]);
    stepIngredients.push(ingredient);
  }

  return stepIngredients;
}

/**
 * Format timer text for display
 */
function formatTimerText(name: string | undefined, time: string): string {
  if (time.includes('%')) {
    const [duration, unit] = time.split('%');
    return name ? `${name} (${duration} ${unit})` : `${duration} ${unit}`;
  }
  return name ? `${name} (${time})` : time;
}

/**
 * Remove Cooklang markers from text for clean display
 */
function cleanCooklangText(paragraph: string): string {
  return paragraph
    .replace(/@([^@#~{}\n]+?)(?:\{[^}]*\})?/g, (_, name) => name.trim())
    .replace(/#([^@#~{}\n]+?)(?:\{[^}]*\})?/g, (_, name) => name.trim())
    .replace(/~(?:([^{]+))?\{([^}]*)\}/g, (_, name, time) => formatTimerText(name, time));
}

/**
 * Simple Cooklang parser for preview purposes
 *
 * This is a lightweight client-side parser for live preview.
 * It extracts ingredients and renders steps from Cooklang content.
 */
function parseForPreview(content: string): ParsedRecipe {
  const ingredients: IIngredient[] = [];
  const steps: IStep[] = [];
  const seenIngredients = new Set<string>();

  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('>>'));

  for (const paragraph of paragraphs) {
    const stepIngredients = extractIngredientsFromParagraph(paragraph);

    // Add unique ingredients to global list
    for (const ingredient of stepIngredients) {
      const key = ingredient.name.toLowerCase();
      if (!seenIngredients.has(key)) {
        seenIngredients.add(key);
        ingredients.push(ingredient);
      }
    }

    const cleanText = cleanCooklangText(paragraph).trim();
    if (!cleanText) {
      continue;
    }

    const step: IStep = { text: cleanText };
    if (stepIngredients.length > 0) {
      step.ingredients = stepIngredients;
    }
    steps.push(step);
  }

  return { ingredients, steps };
}

export function CooklangPreview({ content, className }: CooklangPreviewProps) {
  const parsed = useMemo(() => parseForPreview(content), [content]);

  const hasContent = parsed.steps.length > 0 || parsed.ingredients.length > 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-medium text-foreground">Preview</h3>
        {hasContent && (
          <span className="text-xs text-muted-foreground">
            {parsed.ingredients.length} ingredient{parsed.ingredients.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Start writing your recipe to see a preview here.
          </p>
        </div>
      )}

      {/* Content */}
      {hasContent && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Steps */}
          <div className="flex-1">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Instructions
            </h4>
            <ol className="space-y-4">
              {parsed.steps.map((step, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Steps are display-only, no reordering
                <li key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lavender-light text-xs font-medium text-lavender">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Ingredients sidebar */}
          {parsed.ingredients.length > 0 && (
            <div className="w-full shrink-0 lg:w-48">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ingredients
              </h4>
              <ul className="space-y-2">
                {parsed.ingredients.map((ing, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Ingredients are display-only, no reordering
                  <li key={index} className="text-sm">
                    <span className="font-medium text-foreground">{ing.name}</span>
                    {(ing.quantity || ing.unit) && (
                      <span className="ml-1 text-muted-foreground">
                        {ing.quantity}
                        {ing.unit && ` ${ing.unit}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Parse error */}
      {parsed.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {parsed.error}
        </div>
      )}
    </div>
  );
}
