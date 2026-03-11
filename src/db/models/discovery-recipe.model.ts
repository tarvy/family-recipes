/** DiscoveryRecipe model for external recipe data from TheMealDB and Spoonacular. */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IDiscoveryRecipeDocument } from '../types';

const discoveryRecipeSchema = new Schema<IDiscoveryRecipeDocument>(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['themealdb', 'spoonacular'],
    },
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    category: {
      type: String,
    },
    cuisine: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    ingredients: {
      type: [
        new Schema(
          {
            name: { type: String, required: true },
            quantity: { type: String },
            unit: { type: String },
          },
          { _id: false },
        ),
      ],
    },
    instructions: {
      type: String,
    },
    sourceUrl: {
      type: String,
    },
    rawData: {
      type: Schema.Types.Mixed,
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    cleanedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

discoveryRecipeSchema.index({ qualityScore: -1 });
discoveryRecipeSchema.index({ source: 1, category: 1 });
discoveryRecipeSchema.index({ title: 'text', tags: 'text' });

export const DiscoveryRecipe: Model<IDiscoveryRecipeDocument> =
  mongoose.models['DiscoveryRecipe'] ||
  mongoose.model<IDiscoveryRecipeDocument>('DiscoveryRecipe', discoveryRecipeSchema);
