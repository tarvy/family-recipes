/**
 * OAuthClient model for registered OAuth 2.1 clients.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IOAuthClientDocument } from '../types';

const oauthClientSchema = new Schema<IOAuthClientDocument>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    clientSecretHash: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    redirectUris: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes (clientId index created by unique: true)
oauthClientSchema.index({ name: 1 });

export const OAuthClient: Model<IOAuthClientDocument> =
  mongoose.models['OAuthClient'] ||
  mongoose.model<IOAuthClientDocument>('OAuthClient', oauthClientSchema);
