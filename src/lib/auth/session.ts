/**
 * Session management for authentication
 *
 * Handles creation, validation, and deletion of user sessions.
 *
 * Usage:
 *   import { createSession, validateSession, deleteSession } from '@/lib/auth/session';
 *
 *   // Create session after successful auth
 *   const session = await createSession(userId);
 *
 *   // Validate session from cookie
 *   const result = await validateSession(token);
 *
 *   // Delete session on logout
 *   await deleteSession(token);
 */

import { nanoid } from 'nanoid';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { connectDB } from '@/db/connection';
import { Session, User, type UserRole } from '@/db/models';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

/** Session duration in seconds (7 days) */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

/** Cookie name for session token */
export const SESSION_COOKIE_NAME = 'session';

/** Cookie options for session cookie */
export const SESSION_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface CreateSessionResult {
  token: string;
  expiresAt: Date;
}

export interface ValidateSessionResult {
  valid: boolean;
  user?: SessionUser;
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<CreateSessionResult> {
  return withTrace('auth.session.create', async (span) => {
    span.setAttribute('user_id', userId);

    logger.auth.info('Creating session', { userId });

    await connectDB();

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

    await traceDbQuery('create', 'sessions', async () => {
      await Session.create({
        userId,
        token,
        expiresAt,
      });
    });

    logger.auth.info('Session created', { userId });
    return { token, expiresAt };
  });
}

/**
 * Validate a session token and return the associated user
 */
export async function validateSession(token: string): Promise<ValidateSessionResult> {
  return withTrace('auth.session.validate', async (span) => {
    span.setAttribute('token_length', token.length);

    try {
      await connectDB();

      // Find valid session
      const session = await traceDbQuery('findOne', 'sessions', async () => {
        return Session.findOne({
          token,
          expiresAt: { $gt: new Date() },
        });
      });

      if (!session) {
        logger.auth.debug('Session not found or expired');
        return { valid: false };
      }

      // Find user
      const user = await traceDbQuery('findById', 'users', async () => {
        return User.findById(session.userId);
      });

      if (!user) {
        logger.auth.warn('Session references non-existent user', {
          userId: session.userId.toString(),
        });
        return { valid: false };
      }

      span.setAttribute('user_id', user._id.toString());

      const sessionUser: SessionUser = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
      if (user.name !== undefined) {
        sessionUser.name = user.name;
      }

      return {
        valid: true,
        user: sessionUser,
      };
    } catch (error) {
      logger.auth.error('Session validation failed', error instanceof Error ? error : undefined);
      return { valid: false };
    }
  });
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  return withTrace('auth.session.delete', async () => {
    logger.auth.info('Deleting session');

    try {
      await connectDB();

      await traceDbQuery('deleteOne', 'sessions', async () => {
        await Session.deleteOne({ token });
      });

      logger.auth.info('Session deleted');
    } catch (error) {
      logger.auth.error('Session deletion failed', error instanceof Error ? error : undefined);
    }
  });
}

/**
 * Get the current user from cookies
 *
 * Use in Server Components and API routes:
 *   import { cookies } from 'next/headers';
 *   const user = await getSessionFromCookies(await cookies());
 */
export async function getSessionFromCookies(
  cookieStore: ReadonlyRequestCookies,
): Promise<SessionUser | null> {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const result = await validateSession(token);
  return result.valid && result.user ? result.user : null;
}
