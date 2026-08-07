/**
 * POST /api/admin/magic-link
 *
 * Generate a short-lived magic link for manual owner distribution.
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';
import { ensureOwnerAllowlist, findAllowedEmail, isValidEmail, normalizeEmail } from '@/lib/auth/allowlist';
import { createMagicLink } from '@/lib/auth/magic-link';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

interface CreateMagicLinkRequest {
  email?: unknown;
}

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.admin.magic-link.create', async (span) => {
      const user = await getSessionFromCookies(await cookies());

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      if (user.role !== 'owner') {
        span.setAttribute('error', 'forbidden');
        logger.auth.warn('Manual magic-link generation denied', { userId: user.id });
        return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
      }

      try {
        const body = (await request.json()) as CreateMagicLinkRequest;
        const email = getEmail(body.email);

        if (!email) {
          span.setAttribute('error', 'invalid_email');
          return Response.json({ error: 'invalid_email' }, { status: HTTP_BAD_REQUEST });
        }

        await ensureOwnerAllowlist();
        const allowedEmail = await findAllowedEmail(email);

        if (!allowedEmail) {
          span.setAttribute('error', 'not_allowed');
          return Response.json({ error: 'not_allowed' }, { status: HTTP_FORBIDDEN });
        }

        const result = await createMagicLink(email);

        if (!result.success || !result.url || !result.expiresAt) {
          span.setAttribute('error', result.error ?? 'generation_failed');
          return Response.json(
            { error: 'generation_failed' },
            { status: HTTP_INTERNAL_SERVER_ERROR },
          );
        }

        span.setAttribute('email', email);
        logger.auth.info('Owner generated manual magic link', {
          ownerId: user.id,
          email,
          expiresAt: result.expiresAt.toISOString(),
        });

        return Response.json({
          url: result.url,
          expiresAt: result.expiresAt.toISOString(),
        });
      } catch (error) {
        logger.api.error('Manual magic-link endpoint failed', toError(error));
        span.setAttribute('error', 'server_error');
        return Response.json({ error: 'server_error' }, { status: HTTP_INTERNAL_SERVER_ERROR });
      }
    }),
  );
}

function getEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = normalizeEmail(value);
  return isValidEmail(email) ? email : null;
}
