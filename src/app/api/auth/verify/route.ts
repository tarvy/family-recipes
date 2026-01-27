/**
 * GET /api/auth/verify
 *
 * Verify a magic link token, create/find user, create session, and redirect.
 * This is the callback URL from magic link emails.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectDB } from '@/db/connection';
import { AllowedEmail, type AllowedEmailRole, User } from '@/db/models';
import {
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  verifyMagicLink,
} from '@/lib/auth';
import { ensureOwnerAllowlist } from '@/lib/auth/allowlist';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

type VerificationOutcome = { email: string } | { response: Response };

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
      const verification = await resolveVerification(token, span);
      if ('response' in verification) {
        return verification.response;
      }

      span.setAttribute('email', verification.email);

      await connectDB();
      await ensureOwnerAllowlist();

      const allowedEmail = await resolveAllowedEmail(verification.email);
      if (!allowedEmail) {
        return NextResponse.redirect(buildRedirectUrl('/login', 'not_allowed'));
      }

      const { user, isNewUser } = await resolveUser(verification.email, allowedEmail.role);
      await markFirstSignedIn(allowedEmail);

      span.setAttribute('user_id', user._id.toString());
      span.setAttribute('is_new_user', isNewUser);

      const session = await createSession(user._id.toString());

      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

      logger.auth.info('User authenticated successfully', {
        userId: user._id.toString(),
        email: user.email,
      });

      return NextResponse.redirect(buildRedirectUrl('/'));
    } catch (error) {
      logger.api.error('Auth verify endpoint error', error instanceof Error ? error : undefined);
      return NextResponse.redirect(buildRedirectUrl('/login', 'server_error'));
    }
  });
}

async function resolveVerification(
  token: string,
  span: { setAttribute: (key: string, value: string) => void },
): Promise<VerificationOutcome> {
  const verification = await verifyMagicLink(token);

  if (!(verification.success && verification.email)) {
    span.setAttribute('error', verification.error || 'invalid_token');
    logger.auth.warn('Token verification failed', {
      error: verification.error,
    });
    return {
      response: NextResponse.redirect(
        buildRedirectUrl('/login', verification.error || 'invalid_token'),
      ),
    };
  }

  return { email: verification.email };
}

async function resolveAllowedEmail(email: string) {
  const allowedEmail = await traceDbQuery('findOne', 'allowedEmails', async () => {
    return AllowedEmail.findOne({ email });
  });

  if (!allowedEmail) {
    logger.auth.warn('Sign-in blocked for non-allowlisted email', {
      email,
    });
    return null;
  }

  return allowedEmail;
}

async function resolveUser(email: string, role: AllowedEmailRole) {
  const existingUser = await traceDbQuery('findOne', 'users', async () => {
    return User.findOne({ email });
  });
  const isNewUser = !existingUser;
  let user = existingUser;

  if (!user) {
    user = await traceDbQuery('create', 'users', async () => {
      return User.create({
        email,
        role,
      });
    });
    logger.auth.info('New user created', { email });
  }

  if (!user) {
    throw new Error('User creation failed');
  }

  if (!isNewUser && user.role !== role) {
    const userId = user._id;
    await traceDbQuery('updateOne', 'users', async () => {
      return User.updateOne({ _id: userId }, { $set: { role } });
    });
    logger.auth.info('User role updated from allowlist', {
      email,
      role,
    });
  }

  return { user, isNewUser };
}

async function markFirstSignedIn(allowedEmail: { _id: unknown; firstSignedInAt?: Date | null }) {
  if (allowedEmail.firstSignedInAt) {
    return;
  }

  await traceDbQuery('updateOne', 'allowedEmails', async () => {
    return AllowedEmail.updateOne(
      { _id: allowedEmail._id },
      { $set: { firstSignedInAt: new Date() } },
    );
  });
}
