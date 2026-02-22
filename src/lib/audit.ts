/**
 * Fire-and-forget audit logging for recipe operations.
 *
 * Usage:
 *   import { audit } from '@/lib/audit';
 *
 *   audit({
 *     operation: 'recipe:create',
 *     source: 'mcp',
 *     message: 'Recipe created: beef-stroganoff',
 *     resource: { type: 'recipe', slug: 'beef-stroganoff', category: 'entrees' },
 *   });
 */

import { connectDB } from '@/db/connection';
import { AuditLog } from '@/db/models/audit-log.model';
import type {
  AuditLevel,
  AuditOperation,
  AuditSource,
  IAuditActor,
  IAuditResource,
} from '@/db/types';
import { logger } from '@/lib/logger';

export interface AuditEvent {
  operation: AuditOperation;
  source: AuditSource;
  message: string;
  resource: IAuditResource;
  actor?: IAuditActor;
  metadata?: Record<string, unknown>;
  level?: AuditLevel;
}

/**
 * Log an audit event (fire-and-forget).
 *
 * Uses .catch() to handle the promise without blocking the caller,
 * satisfying Biome's no-floating-promises rule.
 */
export function audit(event: AuditEvent): void {
  writeAuditEvent(event).catch(() => {});
}

async function writeAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      ...event,
      level: event.level ?? 'info',
      actor: event.actor ?? {},
      timestamp: new Date(),
    });
  } catch (error) {
    logger.db.error('Audit write failed', error instanceof Error ? error : undefined, {
      operation: event.operation,
    });
  }
}
