/**
 * Allowed email model for allowlist and invitations.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IAllowedEmailDocument } from '../types';

const allowedEmailSchema = new Schema<IAllowedEmailDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    role: {
      type: String,
      enum: ['owner', 'family', 'friend'],
      required: true,
    },
    firstSignedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes (email index created by unique: true)
allowedEmailSchema.index({ invitedBy: 1 });

export const AllowedEmail: Model<IAllowedEmailDocument> =
  mongoose.models['AllowedEmail'] ||
  mongoose.model<IAllowedEmailDocument>('AllowedEmail', allowedEmailSchema);
