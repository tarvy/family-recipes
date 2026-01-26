/**
 * RecipeFavorite model for tracking user favorites.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IRecipeFavoriteDocument } from '../types';

const recipeFavoriteSchema = new Schema<IRecipeFavoriteDocument>(
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound unique index to prevent duplicate favorites
recipeFavoriteSchema.index({ userId: 1, recipeId: 1 }, { unique: true });
recipeFavoriteSchema.index({ userId: 1 });
recipeFavoriteSchema.index({ recipeId: 1 });

export const RecipeFavorite: Model<IRecipeFavoriteDocument> =
  mongoose.models['RecipeFavorite'] ||
  mongoose.model<IRecipeFavoriteDocument>('RecipeFavorite', recipeFavoriteSchema);
