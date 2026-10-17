/**
 * Capture model: one row per photo or voice-note capture.
 *
 * `key` is a hash of the submitted bytes, intent, and note, unique so the
 * same submit maps to one capture. Rows expire after 30 days. Media bytes
 * are never stored, only their hashes and sizes.
 *
 * Written only by src/lib/capture/store.ts.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import { HOURS_PER_DAY, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from '@/lib/constants/time';
import {
  CAPTURE_CHANGES,
  CAPTURE_INTENT_KINDS,
  CAPTURE_MEDIA_KINDS,
  CAPTURE_PROBLEM_REASONS,
  CAPTURE_STATUSES,
  DRAFT_TARGET_KINDS,
  type ICaptureDocument,
} from '../types';

const CAPTURE_TTL_DAYS = 30;
const CAPTURE_TTL_SECONDS =
  CAPTURE_TTL_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

const nullableString = { type: String, default: null };

const mediaSchema = new Schema(
  {
    kind: { type: String, enum: CAPTURE_MEDIA_KINDS, required: true },
    mediaType: { type: String, required: true },
    bytes: { type: Number, required: true },
    sha256: { type: String, required: true },
  },
  { _id: false },
);

const draftSchema = new Schema(
  {
    cooklang: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    warnings: { type: [String], default: [] },
    target: {
      kind: { type: String, enum: DRAFT_TARGET_KINDS, required: true },
      slug: nullableString,
      baseCooklang: nullableString,
    },
  },
  { _id: false },
);

const problemSchema = new Schema(
  {
    reason: { type: String, enum: CAPTURE_PROBLEM_REASONS, required: true },
    detail: { type: String, required: true },
    candidates: { type: [String], default: [] },
  },
  { _id: false },
);

const captureSchema = new Schema<ICaptureDocument>(
  {
    key: { type: String, required: true, unique: true },
    submittedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      keyId: { type: String, required: true },
    },
    intent: {
      kind: { type: String, enum: CAPTURE_INTENT_KINDS, required: true },
      slug: nullableString,
    },
    media: { type: [mediaSchema], required: true },
    status: { type: String, enum: CAPTURE_STATUSES, required: true },
    attempt: { type: Number, required: true, min: 1 },
    leaseExpiresAt: { type: Date, default: null },
    draft: { type: draftSchema, default: null },
    savedSlug: nullableString,
    change: { type: String, enum: [...CAPTURE_CHANGES, null], default: null },
    problem: { type: problemSchema, default: null },
    errorMessage: nullableString,
  },
  {
    collection: 'captures',
    timestamps: true,
  },
);

// Indexes (key index created by unique: true)
captureSchema.index({ createdAt: 1 }, { expireAfterSeconds: CAPTURE_TTL_SECONDS });

export const Capture: Model<ICaptureDocument> =
  mongoose.models['Capture'] || mongoose.model<ICaptureDocument>('Capture', captureSchema);
