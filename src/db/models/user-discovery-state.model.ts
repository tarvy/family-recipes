/** UserDiscoveryState model for tracking seen/saved/dismissed discovery recipes per user. */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IUserDiscoveryStateDocument } from '../types';

const userDiscoveryStateSchema = new Schema<IUserDiscoveryStateDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['seen', 'saved', 'dismissed'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

userDiscoveryStateSchema.index({ userId: 1, externalId: 1 }, { unique: true });
userDiscoveryStateSchema.index({ userId: 1, action: 1 });

export const UserDiscoveryState: Model<IUserDiscoveryStateDocument> =
  mongoose.models['UserDiscoveryState'] ||
  mongoose.model<IUserDiscoveryStateDocument>('UserDiscoveryState', userDiscoveryStateSchema);
