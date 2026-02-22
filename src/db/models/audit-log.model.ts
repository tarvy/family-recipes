/**
 * Audit log model for tracking recipe CRUD operations.
 *
 * Stores timestamped audit events in MongoDB with a TTL index
 * that automatically expires entries after 30 days.
 */

import mongoose, { type Model, Schema } from 'mongoose';
import type { IAuditLogDocument } from '../types';

/** 30 days in seconds */
const AUDIT_TTL_SECONDS = 30 * 24 * 60 * 60;

const AUDIT_OPERATIONS = ['recipe:create', 'recipe:update', 'recipe:delete'] as const;
const AUDIT_SOURCES = ['mcp', 'api', 'web', 'sync', 'cli', 'import'] as const;
const AUDIT_LEVELS = ['info', 'warn', 'error'] as const;

const actorSchema = new Schema(
  {
    clientId: { type: String },
    userId: { type: String },
    email: { type: String },
  },
  { _id: false },
);

const resourceSchema = new Schema(
  {
    type: { type: String, required: true, enum: ['recipe'] },
    slug: { type: String, required: true },
    category: { type: String },
  },
  { _id: false },
);

const auditLogSchema = new Schema<IAuditLogDocument>({
  operation: {
    type: String,
    required: true,
    enum: AUDIT_OPERATIONS,
  },
  source: {
    type: String,
    required: true,
    enum: AUDIT_SOURCES,
  },
  level: {
    type: String,
    enum: AUDIT_LEVELS,
    default: 'info',
  },
  message: { type: String, required: true },
  actor: { type: actorSchema, default: () => ({}) },
  resource: { type: resourceSchema, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

// TTL index: auto-delete after 30 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: AUDIT_TTL_SECONDS });

// Query indexes
auditLogSchema.index({ operation: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.slug': 1 });
auditLogSchema.index({ source: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models['AuditLog'] || mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
