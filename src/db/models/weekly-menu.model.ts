/** WeeklyMenu model with embedded assignment and vote subdocuments. */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IWeeklyMenuDocument } from '../types';

const assignmentSchema = new Schema(
  {
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
    },
    discoveryRecipeId: {
      type: Schema.Types.ObjectId,
      ref: 'DiscoveryRecipe',
    },
    title: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    source: {
      type: String,
      required: true,
      enum: ['cookbook', 'discovery'],
    },
    day: {
      type: String,
      required: true,
      enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    },
    mealSlot: {
      type: String,
      default: 'dinner',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const voteSchema = new Schema(
  {
    voterName: {
      type: String,
      required: true,
    },
    voterToken: {
      type: String,
      required: true,
    },
    picks: {
      type: [Schema.Types.ObjectId],
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const weeklyMenuSchema = new Schema<IWeeklyMenuDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weekLabel: {
      type: String,
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['building', 'survey-sent', 'locked-in'],
      default: 'building',
    },
    assignments: {
      type: [assignmentSchema],
      default: [],
    },
    votes: {
      type: [voteSchema],
      default: [],
    },
    votingToken: {
      type: String,
    },
    votingOpenedAt: {
      type: Date,
    },
    votingClosesAt: {
      type: Date,
    },
    finalizedAt: {
      type: Date,
    },
    shoppingListId: {
      type: Schema.Types.ObjectId,
      ref: 'ShoppingList',
    },
  },
  {
    timestamps: true,
  },
);

weeklyMenuSchema.index({ ownerId: 1, weekLabel: 1 }, { unique: true });
weeklyMenuSchema.index({ ownerId: 1, status: 1 });
weeklyMenuSchema.index({ votingToken: 1 }, { unique: true, sparse: true });
weeklyMenuSchema.index({ votingClosesAt: 1 }, { sparse: true });

export const WeeklyMenu: Model<IWeeklyMenuDocument> =
  mongoose.models['WeeklyMenu'] ||
  mongoose.model<IWeeklyMenuDocument>('WeeklyMenu', weeklyMenuSchema);
