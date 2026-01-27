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
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (user.role !== OWNER_ROLE) {
      span.setAttribute('error', 'forbidden');
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    await ensureOwnerAllowlist();

    const decodedEmail = decodeURIComponent(params.email);
    const normalizedEmail = normalizeEmail(decodedEmail);

    if (!isValidEmail(normalizedEmail)) {
      span.setAttribute('error', 'invalid_email');
      return Response.json({ error: 'invalid_email' }, { status: 400 });
    }

    const removed = await removeAllowedEmail(normalizedEmail);

    if (!removed) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    logger.auth.info('Allowlist entry removed', {
      email: normalizedEmail,
      removedBy: user.id,
    });

    return Response.json({ success: true });
  });
}
