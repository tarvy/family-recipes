/**
 * MagicLink model for passwordless email authentication.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IMagicLinkDocument } from '../types';

const magicLinkSchema = new Schema<IMagicLinkDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes
magicLinkSchema.index({ token: 1 });
magicLinkSchema.index({ email: 1 });
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const MagicLink: Model<IMagicLinkDocument> =
  mongoose.models['MagicLink'] || mongoose.model<IMagicLinkDocument>('MagicLink', magicLinkSchema);
