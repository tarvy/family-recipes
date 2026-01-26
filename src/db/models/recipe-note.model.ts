/**
 * RecipeNote model for user notes on recipes.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IRecipeNoteDocument } from '../types';

const recipeNoteSchema = new Schema<IRecipeNoteDocument>(
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
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
recipeNoteSchema.index({ userId: 1 });
recipeNoteSchema.index({ recipeId: 1 });
recipeNoteSchema.index({ userId: 1, recipeId: 1 });

export const RecipeNote: Model<IRecipeNoteDocument> =
  mongoose.models['RecipeNote'] ||
  mongoose.model<IRecipeNoteDocument>('RecipeNote', recipeNoteSchema);
