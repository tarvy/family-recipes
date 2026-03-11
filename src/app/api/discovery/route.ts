/** GET /api/discovery */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { listDiscoveryRecipes } from '@/lib/discovery/service';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.discovery.list', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);
      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }
      span.setAttribute('user_id', user.id);

      try {
        const url = new URL(request.url);
        const page = Math.max(DEFAULT_PAGE, Number(url.searchParams.get('page')) || DEFAULT_PAGE);
        const limit = Math.min(
          MAX_LIMIT,
          Math.max(DEFAULT_PAGE, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT),
        );
        const query = url.searchParams.get('q') ?? undefined;

        span.setAttributes({ page, limit, query: query ?? '' });
        const result = await listDiscoveryRecipes(page, limit, query);
        return Response.json(result);
      } catch (error) {
        logger.api.error('Failed to list discovery recipes', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to list discovery recipes' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
