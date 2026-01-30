/**
 * GET /api/auth/status
 *
 * Check if the current user is authenticated.
 * Returns 200 if authenticated, 401 if not.
 */

import { getSessionFromRequest, validateSession } from '@/lib/auth';
import { HTTP_OK, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
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
      return Response.json({ authenticated: false }, { status: HTTP_UNAUTHORIZED });
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
