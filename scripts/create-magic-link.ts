#!/usr/bin/env npx tsx
/**
 * Create a one-time magic link for manual distribution.
 *
 * Usage:
 *   npm run create-magic-link -- --email person@example.com
 */

import { loadEnvConfig } from '@next/env';
import { disconnectDB } from '@/db/connection';
import {
  ensureOwnerAllowlist,
  findAllowedEmail,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth/allowlist';
import { createMagicLink } from '@/lib/auth/magic-link';

const PROJECT_DIR = process.cwd();
const EMAIL_FLAG = '--email';
const ARG_START_INDEX = 2;

loadEnvConfig(PROJECT_DIR);

function getEmail(args: string[]): string {
  const emailIndex = args.indexOf(EMAIL_FLAG);
  const emailValue = emailIndex >= 0 ? args[emailIndex + 1] : undefined;

  if (!emailValue) {
    throw new Error('Usage: npm run create-magic-link -- --email person@example.com');
  }

  const email = normalizeEmail(emailValue);
  if (!isValidEmail(email)) {
    throw new Error('A valid email address is required');
  }

  return email;
}

async function main(): Promise<void> {
  const email = getEmail(process.argv.slice(ARG_START_INDEX));

  await ensureOwnerAllowlist();
  const allowedEmail = await findAllowedEmail(email);
  if (!allowedEmail) {
    throw new Error('Email is not on the allowlist');
  }

  const result = await createMagicLink(email);
  if (!(result.success && result.url && result.expiresAt)) {
    throw new Error(result.error ?? 'Unable to create magic link');
  }

  process.stdout.write(`${result.url}\n`);
  process.stdout.write(`Expires: ${result.expiresAt.toISOString()}\n`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Magic-link creation failed';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
