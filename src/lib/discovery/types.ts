/**
 * TheMealDB API response types and cleaning pipeline types.
 *
 * These types model the raw external API data and the intermediate
 * structures used during the cleaning/scoring/tagging pipeline
 * before data lands in MongoDB as DiscoveryRecipe documents.
 */

// -----------------------------------------------------------------------------
// TheMealDB API Response Types
// -----------------------------------------------------------------------------

/** Number of ingredient/measure slots in TheMealDB API responses */
const THEMEALDB_INGREDIENT_SLOTS = 20;

/** Numeric indices 1..20 for TheMealDB ingredient/measure field keys */
const INGREDIENT_SLOT_INDICES: readonly number[] = Array.from(
  { length: THEMEALDB_INGREDIENT_SLOTS },
  (_, index) => index + 1,
);

/**
 * Raw meal object from TheMealDB /lookup.php or /search.php endpoint.
 *
 * Fields strIngredient1..20 and strMeasure1..20 are nullable strings.
 * Many fields can be null or empty string in the API response.
 */
export interface TheMealDBMeal {
  idMeal: string;
  strMeal: string;
  strDrinkAlternate: string | null;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strTags: string | null;
  strYoutube: string | null;
  strSource: string | null;
  strImageSource: string | null;
  strCreativeCommonsConfirmed: string | null;
  dateModified: string | null;

  // Ingredient/Measure slots 1-20 (dynamic keys)
  strIngredient1: string | null;
  strIngredient2: string | null;
  strIngredient3: string | null;
  strIngredient4: string | null;
  strIngredient5: string | null;
  strIngredient6: string | null;
  strIngredient7: string | null;
  strIngredient8: string | null;
  strIngredient9: string | null;
  strIngredient10: string | null;
  strIngredient11: string | null;
  strIngredient12: string | null;
  strIngredient13: string | null;
  strIngredient14: string | null;
  strIngredient15: string | null;
  strIngredient16: string | null;
  strIngredient17: string | null;
  strIngredient18: string | null;
  strIngredient19: string | null;
  strIngredient20: string | null;

  strMeasure1: string | null;
  strMeasure2: string | null;
  strMeasure3: string | null;
  strMeasure4: string | null;
  strMeasure5: string | null;
  strMeasure6: string | null;
  strMeasure7: string | null;
  strMeasure8: string | null;
  strMeasure9: string | null;
  strMeasure10: string | null;
  strMeasure11: string | null;
  strMeasure12: string | null;
  strMeasure13: string | null;
  strMeasure14: string | null;
  strMeasure15: string | null;
  strMeasure16: string | null;
  strMeasure17: string | null;
  strMeasure18: string | null;
  strMeasure19: string | null;
  strMeasure20: string | null;
}

/**
 * Raw API response wrapper from TheMealDB search/filter endpoints.
 * `meals` is null when no results are found.
 */
export interface TheMealDBResponse {
  meals: TheMealDBMeal[] | null;
}

// -----------------------------------------------------------------------------
// Cleaning Pipeline Types
// -----------------------------------------------------------------------------

/** A cleaned ingredient with structured quantity/unit and optional prep info */
export interface CleanedIngredient {
  name: string;
  quantity: string;
  unit: string;
  prep?: string;
  originalName?: string;
  originalMeasure?: string;
}

/**
 * A fully cleaned meal ready for scoring, tagging, and DB storage.
 * Produced by the cleaner from a raw TheMealDBMeal.
 */
export interface CleanedMeal {
  externalId: string;
  title: string;
  category: string | null;
  cuisine: string | null;
  instructions: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  tags: string | null;
  ingredients: CleanedIngredient[];
  rawData: TheMealDBMeal;
}

// -----------------------------------------------------------------------------
// Scoring Types
// -----------------------------------------------------------------------------

/** Breakdown of individual scoring factors for debugging/logging */
export interface QualityScoreBreakdown {
  ingredientScore: number;
  instructionScore: number;
  imageScore: number;
  categoryScore: number;
  cuisineScore: number;
  total: number;
}

// -----------------------------------------------------------------------------
// Pipeline Progress Types
// -----------------------------------------------------------------------------

/** Callback for reporting fetch progress per letter */
export type FetchProgressCallback = (letter: string, count: number) => void;

/** Summary of a full pipeline run */
export interface PipelineSummary {
  totalFetched: number;
  totalCleaned: number;
  totalStored: number;
  totalErrors: number;
  averageScore: number;
  letterCounts: Record<string, number>;
}

/** Number of ingredient slots in TheMealDB responses */
export { THEMEALDB_INGREDIENT_SLOTS, INGREDIENT_SLOT_INDICES };
