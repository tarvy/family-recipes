/**
 * Session model for user authentication sessions.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { ISessionDocument } from '../types';

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes
sessionSchema.index({ token: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const Session: Model<ISessionDocument> =
  mongoose.models['Session'] || mongoose.model<ISessionDocument>('Session', sessionSchema);
