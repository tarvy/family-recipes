/**
 * Allowlist helpers for authentication access control.
 */

import { connectDB } from '@/db/connection';
import { AllowedEmail, type AllowedEmailRole } from '@/db/models';
import { logger } from '@/lib/logger';
import { traceDbQuery } from '@/lib/telemetry';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_ROLE: AllowedEmailRole = 'owner';

export interface AllowedEmailRecord {
  id: string;
  email: string;
  role: AllowedEmailRole;
  invitedBy?: string | null;
  createdAt: string;
  firstSignedInAt?: string | null;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export async function ensureOwnerAllowlist(): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  if (!ownerEmail) {
    return;
  }

  const normalized = normalizeEmail(ownerEmail);
  if (!isValidEmail(normalized)) {
    logger.auth.warn('OWNER_EMAIL is invalid', { ownerEmail });
    return;
  }

  await connectDB();

  const existing = await traceDbQuery('findOne', 'allowedEmails', async () => {
    return AllowedEmail.findOne({ email: normalized });
  });

  if (existing) {
    return;
  }

  await traceDbQuery('create', 'allowedEmails', async () => {
    return AllowedEmail.create({
      email: normalized,
      role: OWNER_ROLE,
    });
  });

  logger.auth.info('Seeded owner allowlist entry', { email: normalized });
}

export async function findAllowedEmail(email: string) {
  await connectDB();
  return traceDbQuery('findOne', 'allowedEmails', async () => {
    return AllowedEmail.findOne({ email });
  });
}

export async function listAllowedEmails(): Promise<AllowedEmailRecord[]> {
  await connectDB();

  const records = await traceDbQuery('find', 'allowedEmails', async () => {
    return AllowedEmail.find({}).sort({ createdAt: -1 });
  });

  return records.map((record) => ({
    id: record._id.toString(),
    email: record.email,
    role: record.role,
    invitedBy: record.invitedBy ? record.invitedBy.toString() : null,
    createdAt: record.createdAt.toISOString(),
    firstSignedInAt: record.firstSignedInAt ? record.firstSignedInAt.toISOString() : null,
  }));
}

export async function addAllowedEmail(options: {
  email: string;
  role: AllowedEmailRole;
  invitedBy?: string;
}): Promise<AllowedEmailRecord> {
  await connectDB();

  const existing = await traceDbQuery('findOne', 'allowedEmails', async () => {
    return AllowedEmail.findOne({ email: options.email });
  });

  if (existing) {
    return {
      id: existing._id.toString(),
      email: existing.email,
      role: existing.role,
      invitedBy: existing.invitedBy ? existing.invitedBy.toString() : null,
      createdAt: existing.createdAt.toISOString(),
      firstSignedInAt: existing.firstSignedInAt ? existing.firstSignedInAt.toISOString() : null,
    };
  }

  const created = await traceDbQuery('create', 'allowedEmails', async () => {
    return AllowedEmail.create({
      email: options.email,
      role: options.role,
      invitedBy: options.invitedBy ?? null,
    });
  });

  return {
    id: created._id.toString(),
    email: created.email,
    role: created.role,
    invitedBy: created.invitedBy ? created.invitedBy.toString() : null,
    createdAt: created.createdAt.toISOString(),
    firstSignedInAt: created.firstSignedInAt ? created.firstSignedInAt.toISOString() : null,
  };
}

export async function removeAllowedEmail(email: string): Promise<boolean> {
  await connectDB();

  const result = await traceDbQuery('deleteOne', 'allowedEmails', async () => {
    return AllowedEmail.deleteOne({ email });
  });

  return result.deletedCount === 1;
}
