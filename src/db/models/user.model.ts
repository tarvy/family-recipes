/**
 * User model for authentication and authorization.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IUserDocument } from '../types';

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'family', 'friend'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes (email index created by unique: true)

export const User: Model<IUserDocument> =
  mongoose.models['User'] || mongoose.model<IUserDocument>('User', userSchema);
