/** Quality scoring utilities for cleaned discovery recipes. */

import type { CleanedMeal, QualityScoreBreakdown } from '@/lib/discovery/types';

const INGREDIENT_WEIGHT = 40;
const INSTRUCTION_WEIGHT = 25;
const IMAGE_WEIGHT = 15;
const CATEGORY_WEIGHT = 10;
const CUISINE_WEIGHT = 10;

const INGREDIENT_COUNT_GOOD = 7;
const INGREDIENT_COUNT_FAIR = 4;
const INSTRUCTION_LENGTH_GOOD = 200;
const INSTRUCTION_LENGTH_FAIR = 50;

const SCORE_TIER_LOW = 10;
const SCORE_TIER_MID = 20;
const SCORE_TIER_HIGH = 30;

export const MIN_QUALITY_SCORE = 60;

function scoreIngredients(count: number): number {
  if (count <= 0) {
    return 0;
  }

  if (count < INGREDIENT_COUNT_FAIR) {
    return SCORE_TIER_MID;
  }

  if (count < INGREDIENT_COUNT_GOOD) {
    return SCORE_TIER_HIGH;
  }

  return INGREDIENT_WEIGHT;
}

function scoreInstructions(instructions: string | null): number {
  const text = instructions?.trim() ?? '';
  if (!text) {
    return 0;
  }

  if (text.length < INSTRUCTION_LENGTH_FAIR) {
    return SCORE_TIER_LOW;
  }

  if (text.length < INSTRUCTION_LENGTH_GOOD) {
    return SCORE_TIER_MID;
  }

  return INSTRUCTION_WEIGHT;
}

function scorePresence(value: string | null, maxScore: number): number {
  return value?.trim() ? maxScore : 0;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function scoreRecipeDetailed(meal: CleanedMeal): QualityScoreBreakdown {
  const ingredientScore = scoreIngredients(meal.ingredients.length);
  const instructionScore = scoreInstructions(meal.instructions);
  const imageScore = scorePresence(meal.imageUrl, IMAGE_WEIGHT);
  const categoryScore = scorePresence(meal.category, CATEGORY_WEIGHT);
  const cuisineScore = scorePresence(meal.cuisine, CUISINE_WEIGHT);

  const total = clampScore(
    Math.round(ingredientScore + instructionScore + imageScore + categoryScore + cuisineScore),
  );

  return {
    ingredientScore,
    instructionScore,
    imageScore,
    categoryScore,
    cuisineScore,
    total,
  };
}

export function scoreRecipe(meal: CleanedMeal): number {
  return scoreRecipeDetailed(meal).total;
}
