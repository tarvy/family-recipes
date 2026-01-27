/**
 * RecipeHistory model for tracking cooking history.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IRecipeHistoryDocument } from '../types';

/** Rating scale: 1-5 stars */
const MIN_RATING = 1;
const MAX_RATING = 5;

const recipeHistorySchema = new Schema<IRecipeHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    cookedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
    },
    rating: {
      type: Number,
      min: MIN_RATING,
      max: MAX_RATING,
    },
  },
  {
    timestamps: false,
  },
);

// Indexes
recipeHistorySchema.index({ userId: 1 });
recipeHistorySchema.index({ recipeId: 1 });
recipeHistorySchema.index({ userId: 1, cookedAt: -1 });

export const RecipeHistory: Model<IRecipeHistoryDocument> =
  mongoose.models['RecipeHistory'] ||
  mongoose.model<IRecipeHistoryDocument>('RecipeHistory', recipeHistorySchema);
