/**
 * OAuthRefreshToken model for refresh tokens.
 * Access tokens are JWTs (not stored in DB).
 * Refresh tokens have a 30-day TTL.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IOAuthRefreshTokenDocument } from '../types';

const oauthRefreshTokenSchema = new Schema<IOAuthRefreshTokenDocument>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    clientId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scope: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes
oauthRefreshTokenSchema.index({ clientId: 1 });
oauthRefreshTokenSchema.index({ userId: 1 });
oauthRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const OAuthRefreshToken: Model<IOAuthRefreshTokenDocument> =
  mongoose.models['OAuthRefreshToken'] ||
  mongoose.model<IOAuthRefreshTokenDocument>('OAuthRefreshToken', oauthRefreshTokenSchema);
