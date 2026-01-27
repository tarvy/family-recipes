/**
 * DELETE /api/admin/allowlist/[email]
 *
 * Owner-only removal of allowlisted emails.
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';
import {
  ensureOwnerAllowlist,
  isValidEmail,
  normalizeEmail,
  removeAllowedEmail,
} from '@/lib/auth/allowlist';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const OWNER_ROLE = 'owner';

interface RouteParams {
  params: {
    email: string;
  };
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  return withTrace('api.admin.allowlist.remove', async (span) => {
    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    if (user.role !== OWNER_ROLE) {
      span.setAttribute('error', 'forbidden');
      return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
    }

    await ensureOwnerAllowlist();

    const decodedEmail = decodeURIComponent(params.email);
    const normalizedEmail = normalizeEmail(decodedEmail);

    if (!isValidEmail(normalizedEmail)) {
      span.setAttribute('error', 'invalid_email');
      return Response.json({ error: 'invalid_email' }, { status: HTTP_BAD_REQUEST });
    }

    const removed = await removeAllowedEmail(normalizedEmail);

    if (!removed) {
      return Response.json({ error: 'not_found' }, { status: HTTP_NOT_FOUND });
    }

    logger.auth.info('Allowlist entry removed', {
      email: normalizedEmail,
      removedBy: user.id,
    });

    return Response.json({ success: true });
  });
}
