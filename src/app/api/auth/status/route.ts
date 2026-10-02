/**
 * GET /api/auth/status
 *
 * Check if the current user is authenticated.
 * Returns 200 if authenticated, 401 if not. When a session cookie is present
 * but no longer valid (expired/deleted session), the stale cookie is cleared
 * so middleware stops treating the browser as signed in. Otherwise the OAuth
 * consent page (/authorize -> /login?return_to=...) would bounce forever.
 */

import { NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  validateSession,
} from '@/lib/auth';
import { HTTP_OK, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return withTrace('api.auth.status', async (span) => {
    const sessionToken = getSessionFromRequest(request);

    if (!sessionToken) {
      span.setAttribute('authenticated', false);
      return Response.json({ authenticated: false }, { status: HTTP_UNAUTHORIZED });
    }

    const result = await validateSession(sessionToken);

    if (!(result.valid && result.user)) {
      span.setAttribute('authenticated', false);
      span.setAttribute('stale_cookie_cleared', true);
      logger.auth.info('Clearing stale session cookie');
      const response = NextResponse.json({ authenticated: false }, { status: HTTP_UNAUTHORIZED });
      response.cookies.set(SESSION_COOKIE_NAME, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
      return response;
    }

    span.setAttribute('authenticated', true);
    span.setAttribute('user_id', result.user.id);

    return Response.json(
      {
        authenticated: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
      { status: HTTP_OK },
    );
  });
}
