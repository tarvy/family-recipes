/**
 * GET /api/auth/verify
 *
 * Verify a magic link token, create/find user, create session, and redirect.
 * This is the callback URL from magic link emails.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectDB } from '@/db/connection';
import { User } from '@/db/models';
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  verifyMagicLink,
} from '@/lib/auth';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

function buildRedirectUrl(path: string, error?: string): string {
  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
  const url = new URL(path, baseUrl);
  if (error) {
    url.searchParams.set('error', error);
  }
  return url.toString();
}

export async function GET(request: Request): Promise<Response> {
  return withTrace('api.auth.verify', async (span) => {
    logger.api.info('Magic link verification requested', { path: '/api/auth/verify' });

    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // Validate token presence
    if (!token) {
      span.setAttribute('error', 'missing_token');
      logger.auth.warn('Verification attempted without token');
      return NextResponse.redirect(buildRedirectUrl('/login', 'missing_token'));
    }

    try {
      // Verify the magic link token
      const verification = await verifyMagicLink(token);

      if (!(verification.success && verification.email)) {
        span.setAttribute('error', verification.error || 'invalid_token');
        logger.auth.warn('Token verification failed', {
          error: verification.error,
        });
        return NextResponse.redirect(
          buildRedirectUrl('/login', verification.error || 'invalid_token'),
        );
      }

      span.setAttribute('email', verification.email);

      await connectDB();

      // Find or create user
      let user = await traceDbQuery('findOne', 'users', async () => {
        return User.findOne({ email: verification.email });
      });

      if (!user) {
        // Create new user with 'family' role
        // First user could be promoted to 'owner' via admin action later
        user = await traceDbQuery('create', 'users', async () => {
          return User.create({
            email: verification.email,
            role: 'family',
          });
        });
        logger.auth.info('New user created', { email: verification.email });
      }

      span.setAttribute('user_id', user._id.toString());
      span.setAttribute('is_new_user', !user.createdAt);

      // Create session
      const session = await createSession(user._id.toString());

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

      logger.auth.info('User authenticated successfully', {
        userId: user._id.toString(),
        email: user.email,
      });

      // Redirect to home
      return NextResponse.redirect(buildRedirectUrl('/'));
    } catch (error) {
      logger.api.error('Auth verify endpoint error', error instanceof Error ? error : undefined);
      return NextResponse.redirect(buildRedirectUrl('/login', 'server_error'));
    }
  });
}
