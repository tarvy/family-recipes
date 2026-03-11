/** POST /api/discovery/refresh */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { refreshFromSource } from '@/lib/discovery/service';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.discovery.refresh', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      if (user.role !== 'owner') {
        span.setAttribute('error', 'forbidden');
        return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
      }
      span.setAttribute('user_id', user.id);

      try {
        const result = await refreshFromSource();
        return Response.json(result);
      } catch (error) {
        logger.api.error('Failed to refresh discovery recipes', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to refresh discovery recipes' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
