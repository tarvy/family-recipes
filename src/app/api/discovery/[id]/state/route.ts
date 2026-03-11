/** POST /api/discovery/[id]/state */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { trackUserState } from '@/lib/discovery/service';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_ACTIONS = new Set(['seen', 'saved', 'dismissed']);

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.discovery.trackState', async (span) => {
      const { id: externalId } = await params;
      span.setAttribute('external_id', externalId);

      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      span.setAttribute('user_id', user.id);

      try {
        const body = (await request.json()) as Record<string, unknown>;
        const action = typeof body['action'] === 'string' ? body['action'] : '';
        if (!VALID_ACTIONS.has(action)) {
          return Response.json(
            { error: 'action must be "seen", "saved", or "dismissed"' },
            { status: HTTP_BAD_REQUEST },
          );
        }

        await trackUserState(user.id, externalId, action as 'seen' | 'saved' | 'dismissed');
        return Response.json({ success: true });
      } catch (error) {
        logger.api.error('Failed to track discovery state', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to track discovery state' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
