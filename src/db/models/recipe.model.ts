/**
 * Recipe model with Cooklang data structure.
 *
 * Stores parsed recipe metadata synced from .cook files.
 * For Atlas Search functionality (M10+ clusters), use the
 * searchRecipes helper function.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IRecipeDocument } from '../types';

// Sub-schemas for embedded documents
const ingredientSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: String },
    unit: { type: String },
  },
  { _id: false },
);

const cookwareSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number },
  },
  { _id: false },
);

const timerSchema = new Schema(
  {
    duration: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    text: { type: String, required: true },
    ingredients: { type: [ingredientSchema], default: [] },
    cookware: { type: [cookwareSchema], default: [] },
    timers: { type: [timerSchema], default: [] },
  },
  { _id: false },
);

const recipeSchema = new Schema<IRecipeDocument>(
  {
    filePath: {
      type: String,
      required: true,
      unique: true,
    },
    gitCommitHash: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
    },
    servings: {
      type: Number,
    },
    prepTime: {
      type: Number,
    },
    cookTime: {
      type: Number,
    },
    totalTime: {
      type: Number,
    },
    difficulty: {
      type: String,
    },
    cuisine: {
      type: String,
    },
    course: {
      type: String,
    },
    ingredients: {
      type: [ingredientSchema],
      default: [],
    },
    cookware: {
      type: [cookwareSchema],
      default: [],
    },
    steps: {
      type: [stepSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    primaryPhotoUrl: {
      type: String,
    },
    photoUrls: {
      type: [String],
      default: [],
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries (slug and filePath indexes created by unique: true)
recipeSchema.index({ tags: 1 });
recipeSchema.index({ cuisine: 1 });
recipeSchema.index({ course: 1 });
recipeSchema.index({ 'ingredients.name': 1 });

// Text index for basic search (free tier compatible)
recipeSchema.index(
  {
    title: 'text',
    description: 'text',
    'ingredients.name': 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      description: 5,
      'ingredients.name': 3,
      tags: 2,
    },
    name: 'recipe_text_search',
  },
);

export const Recipe: Model<IRecipeDocument> =
  mongoose.models['Recipe'] || mongoose.model<IRecipeDocument>('Recipe', recipeSchema);

// -----------------------------------------------------------------------------
// Search Helpers
// -----------------------------------------------------------------------------

/** Default limit for search results */
const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Search recipes using MongoDB text search (M0 compatible).
 *
 * For more advanced search features (fuzzy matching, autocomplete),
 * upgrade to Atlas Search on M10+ clusters.
 */
export async function searchRecipes(
  query: string,
  options: {
    limit?: number;
    skip?: number;
    cuisine?: string;
    course?: string;
    tags?: string[];
  } = {},
): Promise<IRecipeDocument[]> {
  const { limit = DEFAULT_SEARCH_LIMIT, skip = 0, cuisine, course, tags } = options;

  const filter: Record<string, unknown> = {
    $text: { $search: query },
  };

  if (cuisine) {
    filter['cuisine'] = cuisine;
  }

  if (course) {
    filter['course'] = course;
  }

  if (tags && tags.length > 0) {
    filter['tags'] = { $all: tags };
  }

  return Recipe.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .exec();
}

/**
 * Find recipes by ingredient name (partial match).
 */
export async function findRecipesByIngredient(ingredientName: string): Promise<IRecipeDocument[]> {
  return Recipe.find({
    'ingredients.name': { $regex: ingredientName, $options: 'i' },
  }).exec();
}
