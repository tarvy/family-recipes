/** GET + DELETE /api/menu/[id] */

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
import { deleteMenu, getMenuById, MenuError, menuErrorHttpStatus } from '@/lib/menu/service';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.getById', async (span) => {
      const { id } = await params;
      span.setAttribute('menu_id', id);

      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      span.setAttribute('user_id', user.id);

      try {
        const menu = await getMenuById(id);
        return Response.json({ menu });
      } catch (error) {
        if (error instanceof MenuError) {
          span.setAttribute('error', error.code);
          return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
        }
        logger.api.error('Failed to get menu', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to get menu' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.delete', async (span) => {
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
        await deleteMenu(id);
        return Response.json({ success: true });
      } catch (error) {
        if (error instanceof MenuError) {
          span.setAttribute('error', error.code);
          return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
        }
        logger.api.error('Failed to delete menu', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to delete menu' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
