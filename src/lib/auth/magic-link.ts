/**
 * Magic link authentication
 *
 * Handles generation and verification of magic link tokens for passwordless auth.
 *
 * Usage:
 *   import { generateMagicLink, verifyMagicLink } from '@/lib/auth/magic-link';
 *
 *   // Generate and send magic link (optionally returning to a same-origin path)
 *   const result = await generateMagicLink('user@example.com', { returnTo: '/authorize?...' });
 *
 *   // Verify token from URL
 *   const verification = await verifyMagicLink(token);
 */

import { nanoid } from 'nanoid';
import { connectDB } from '@/db/connection';
import { MagicLink } from '@/db/models';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import { RETURN_TO_PARAM, sanitizeReturnTo } from './return-to';

/** Magic link token expiry time in minutes */
const TOKEN_EXPIRY_MINUTES = 15;

/** Magic link token length in characters (provides 128 bits of entropy) */
const MAGIC_LINK_TOKEN_LENGTH = 32;

/** Seconds per minute for time calculations */
const SECONDS_PER_MINUTE = 60;

/** Milliseconds per second for time calculations */
const MILLISECONDS_PER_SECOND = 1000;

export interface GenerateMagicLinkOptions {
  /** Same-origin relative path to land on after verification. */
  returnTo?: string | null;
}

export interface GenerateMagicLinkResult {
  success: boolean;
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
 * Build the verification URL for the magic link. A sanitized `return_to` is
 * appended so /api/auth/verify can send the user back to where login started
 * (e.g. the OAuth consent page) instead of always landing on /recipes.
 */
export function buildVerificationUrl(token: string, returnTo?: string | null): string {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const url = new URL('/api/auth/verify', baseUrl);
  url.searchParams.set('token', token);
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (safeReturnTo) {
    url.searchParams.set(RETURN_TO_PARAM, safeReturnTo);
  }
  return url.toString();
}

/**
 * Build the HTML email content for the magic link
 */
function buildEmailHtml(rawVerifyUrl: string): string {
  // Escape `&` so query separators (token + return_to) are valid HTML
  const verifyUrl = rawVerifyUrl.replaceAll('&', '&amp;');
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Sign in to Family Recipes</h2>
      <p>Click the button below to sign in to your account. This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Sign in
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        If you didn't request this email, you can safely ignore it.
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Or copy and paste this URL into your browser:<br>
        <a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a>
      </p>
    </div>
  `;
}

/**
 * Build plain text email content
 */
function buildEmailText(verifyUrl: string): string {
  return `Sign in to Family Recipes

Click the link below to sign in to your account. This link will expire in ${TOKEN_EXPIRY_MINUTES} minutes.

${verifyUrl}

If you didn't request this email, you can safely ignore it.`;
}

/**
 * Generate a magic link and send it to the user's email
 */
export async function generateMagicLink(
  email: string,
  options: GenerateMagicLinkOptions = {},
): Promise<GenerateMagicLinkResult> {
  return withTrace('auth.magic-link.generate', async (span) => {
    const normalizedEmail = normalizeEmail(email);
    span.setAttribute('email', normalizedEmail);

    logger.auth.info('Generating magic link', { email: normalizedEmail });

    try {
      await connectDB();

      // Generate secure token (32 chars = 128 bits entropy)
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

      // Build and send email
      const verifyUrl = buildVerificationUrl(token, options.returnTo);
      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: 'Sign in to Family Recipes',
        html: buildEmailHtml(verifyUrl),
        text: buildEmailText(verifyUrl),
      });

      if (!emailResult.success) {
        const errorMsg = emailResult.error ?? 'Failed to send email';
        logger.auth.error('Failed to send magic link email', undefined, {
          email: normalizedEmail,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      }

      logger.auth.info('Magic link sent', { email: normalizedEmail });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.auth.error(
        'Magic link generation failed',
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
