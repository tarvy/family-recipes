/**
 * Passkey model for WebAuthn credential storage.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IPasskeyDocument } from '../types';

const passkeySchema = new Schema<IPasskeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
    },
    deviceType: {
      type: String,
    },
    backedUp: {
      type: Boolean,
      default: false,
    },
    transports: {
      type: [String],
      default: [],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Indexes
passkeySchema.index({ credentialId: 1 });
passkeySchema.index({ userId: 1 });

export const Passkey: Model<IPasskeyDocument> =
  mongoose.models['Passkey'] || mongoose.model<IPasskeyDocument>('Passkey', passkeySchema);
