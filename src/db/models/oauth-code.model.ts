/**
 * OAuthCode model for authorization codes.
 * Codes have a 10-minute TTL and are single-use.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IOAuthCodeDocument } from '../types';

const oauthCodeSchema = new Schema<IOAuthCodeDocument>(
  {
    code: {
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
    redirectUri: {
      type: String,
      required: true,
    },
    scope: {
      type: String,
      required: true,
    },
    codeChallenge: {
      type: String,
      required: true,
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
oauthCodeSchema.index({ clientId: 1 });
oauthCodeSchema.index({ userId: 1 });
oauthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export const OAuthCode: Model<IOAuthCodeDocument> =
  mongoose.models['OAuthCode'] || mongoose.model<IOAuthCodeDocument>('OAuthCode', oauthCodeSchema);
