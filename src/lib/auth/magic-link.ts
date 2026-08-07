/**
 * Magic link authentication
 *
 * Handles generation and verification of magic link tokens for passwordless auth.
 *
 * Usage:
 *   import { createMagicLink, verifyMagicLink } from '@/lib/auth/magic-link';
 *
 *   // Generate and send magic link
 *   const result = await createMagicLink('user@example.com');
 *
 *   // Verify token from URL
 *   const verification = await verifyMagicLink(token);
 */

import { nanoid } from 'nanoid';
import { connectDB } from '@/db/connection';
import { MagicLink } from '@/db/models';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

/** Magic link token expiry time in minutes */
const TOKEN_EXPIRY_MINUTES = 15;

/** Magic link token length in characters (provides 128 bits of entropy) */
const MAGIC_LINK_TOKEN_LENGTH = 32;

/** Seconds per minute for time calculations */
const SECONDS_PER_MINUTE = 60;

/** Milliseconds per second for time calculations */
const MILLISECONDS_PER_SECOND = 1000;

export interface CreateMagicLinkResult {
  success: boolean;
  url?: string;
  expiresAt?: Date;
  error?: string;
}

export interface VerifyMagicLinkResult {
  success: boolean;
  email?: string;
  error?: string;
}

/**
 * Normalize email address for consistent storage and lookup
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Build the verification URL for the magic link
 */
function buildVerificationUrl(token: string): string {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  return `${baseUrl}/api/auth/verify?token=${token}`;
}

/**
 * Generate a magic link for manual distribution.
 */
export async function createMagicLink(email: string): Promise<CreateMagicLinkResult> {
  return withTrace('auth.magic-link.create-manual', async (span) => {
    const normalizedEmail = normalizeEmail(email);
    span.setAttribute('email', normalizedEmail);

    logger.auth.info('Generating manual magic link', { email: normalizedEmail });

    try {
      await connectDB();

      const token = nanoid(MAGIC_LINK_TOKEN_LENGTH);
      const expiresAt = new Date(
        Date.now() + TOKEN_EXPIRY_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
      );

      // Delete any existing unused magic links for this email
      await traceDbQuery('deleteMany', 'magicLinks', async () => {
        await MagicLink.deleteMany({
          email: normalizedEmail,
          usedAt: null,
        });
      });

      // Create new magic link
      await traceDbQuery('create', 'magicLinks', async () => {
        await MagicLink.create({
          email: normalizedEmail,
          token,
          expiresAt,
        });
      });

      const verifyUrl = buildVerificationUrl(token);
      logger.auth.info('Manual magic link generated', {
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
      });
      return { success: true, url: verifyUrl, expiresAt };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.auth.error(
        'Manual magic link generation failed',
        error instanceof Error ? error : undefined,
        { email: normalizedEmail },
      );
      return { success: false, error: errorMessage };
    }
  });
}

/**
 * Verify a magic link token
 *
 * Uses atomic update to prevent race conditions and token reuse.
 */
export async function verifyMagicLink(token: string): Promise<VerifyMagicLinkResult> {
  return withTrace('auth.magic-link.verify', async (span) => {
    span.setAttribute('token_length', token.length);

    logger.auth.info('Verifying magic link');

    try {
      await connectDB();

      // Atomically find and mark as used
      // This prevents race conditions where the same token is used twice
      const magicLink = await traceDbQuery('findOneAndUpdate', 'magicLinks', async () => {
        return MagicLink.findOneAndUpdate(
          {
            token,
            usedAt: null,
            expiresAt: { $gt: new Date() },
          },
          {
            $set: { usedAt: new Date() },
          },
          { new: false }, // Return the document before update to get original state
        );
      });

      if (!magicLink) {
        // Token not found, already used, or expired
        logger.auth.warn('Invalid magic link token');
        return { success: false, error: 'invalid_token' };
      }

      logger.auth.info('Magic link verified', { email: magicLink.email });
      return { success: true, email: magicLink.email };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.auth.error(
        'Magic link verification failed',
        error instanceof Error ? error : undefined,
      );
      return { success: false, error: errorMessage };
    }
  });
}
