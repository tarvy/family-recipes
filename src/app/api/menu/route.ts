/** GET + POST /api/menu */

import { cookies } from 'next/headers';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies, type SessionUser } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import {
  createMenuForWeek,
  getOrCreateMenuForWeek,
  MenuError,
  menuErrorHttpStatus,
} from '@/lib/menu/service';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

type SpanLike = { setAttribute: (key: string, value: string) => void };

async function requireFamilyUser(span: SpanLike): Promise<Response | SessionUser> {
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
  return user;
}

export async function GET(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.get', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      span.setAttribute('user_id', user.id);

      try {
        const url = new URL(request.url);
        const week = url.searchParams.get('week') ?? undefined;
        const menu = await getOrCreateMenuForWeek(user.id, week);
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

async function handleCreateMenu(
  request: Request,
  userId: string,
  span: SpanLike,
): Promise<Response> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const weekLabel = typeof body['weekLabel'] === 'string' ? body['weekLabel'] : '';
    if (!weekLabel) {
      return Response.json({ error: 'weekLabel is required' }, { status: HTTP_BAD_REQUEST });
    }
    const menu = await createMenuForWeek(userId, weekLabel);
    return Response.json({ menu });
  } catch (error) {
    if (error instanceof MenuError) {
      span.setAttribute('error', error.code);
      return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
    }
    logger.api.error('Failed to create menu', toError(error));
    span.setAttribute('error', toErrorMessage(error));
    return Response.json(
      { error: 'Failed to create menu' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.create', async (span) => {
      const authResult = await requireFamilyUser(span);
      if (authResult instanceof Response) {
        return authResult;
      }
      span.setAttribute('user_id', authResult.id);
      return handleCreateMenu(request, authResult.id, span);
    }),
  );
}
