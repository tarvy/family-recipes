/** POST /api/menu/[id]/finalize */

import { cookies } from 'next/headers';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { finalizeMenu, MenuError, menuErrorHttpStatus } from '@/lib/menu/service';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.finalize', async (span) => {
      const { id } = await params;
      span.setAttribute('menu_id', id);

      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      if (!isFamilyRole(user.role)) {
        span.setAttribute('error', 'forbidden');
        return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
      }
      span.setAttribute('user_id', user.id);

      try {
        const result = await finalizeMenu(id, user.id);
        return Response.json(result);
      } catch (error) {
        if (error instanceof MenuError) {
          span.setAttribute('error', error.code);
          return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
        }
        logger.api.error('Failed to finalize menu', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to finalize menu' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
