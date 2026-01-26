/**
 * POST /api/auth/logout
 *
 * Destroy the current session and clear the session cookie.
 */

import { cookies } from 'next/headers';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  return withTrace('api.auth.logout', async () => {
    logger.api.info('Logout requested', { path: '/api/auth/logout' });

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (token) {
        // Delete the session from the database
        await deleteSession(token);
      }

      // Clear the session cookie
      cookieStore.delete(SESSION_COOKIE_NAME);

      logger.auth.info('User logged out successfully');

      return Response.json({ success: true });
    } catch (error) {
      logger.api.error('Logout endpoint error', error instanceof Error ? error : undefined);
      // Still clear the cookie even if DB deletion fails
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);

      return Response.json({ success: true });
    }
  });
}
