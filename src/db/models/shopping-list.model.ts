/**
 * ShoppingList model with embedded items pattern.
 *
 * Shopping list items are embedded documents rather than separate
 * collections, since they're always accessed with their parent list
 * and never queried independently.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IShoppingListDocument } from '../types';

// Sub-schema for embedded shopping list items
const shoppingListItemSchema = new Schema(
  {
    ingredientName: {
      type: String,
      required: true,
    },
    quantity: {
      type: String,
    },
    unit: {
      type: String,
    },
    category: {
      type: String,
    },
    isChecked: {
      type: Boolean,
      default: false,
    },
    checkedAt: {
      type: Date,
      default: null,
    },
    checkedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sourceRecipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
    },
    isManuallyAdded: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }, // Items get their own _id for easy updates
);

// Sub-schema for linked recipes
const shoppingListRecipeSchema = new Schema(
  {
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    servingsMultiplier: {
      type: Number,
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const shoppingListSchema = new Schema<IShoppingListDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      required: true,
      default: 'active',
    },
    items: {
      type: [shoppingListItemSchema],
      default: [],
    },
    recipes: {
      type: [shoppingListRecipeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
shoppingListSchema.index({ userId: 1 });
shoppingListSchema.index({ userId: 1, status: 1 });

export const ShoppingList: Model<IShoppingListDocument> =
  mongoose.models['ShoppingList'] ||
  mongoose.model<IShoppingListDocument>('ShoppingList', shoppingListSchema);
