/**
 * API key model for per-device machine credentials (phone Shortcuts, scripts).
 *
 * Stores the public key id and a SHA-256 of the secret, never the secret.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import { API_KEY_SCOPES, type IApiKeyDocument } from '../types';

const apiKeySchema = new Schema<IApiKeyDocument>(
  {
    keyId: {
      type: String,
      required: true,
      unique: true,
    },
    secretHash: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scopes: {
      type: [{ type: String, enum: API_KEY_SCOPES }],
      default: [],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'api_keys',
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes (keyId index created by unique: true)
apiKeySchema.index({ userId: 1 });

export const ApiKey: Model<IApiKeyDocument> =
  mongoose.models['ApiKey'] || mongoose.model<IApiKeyDocument>('ApiKey', apiKeySchema);
