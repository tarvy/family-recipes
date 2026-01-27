/**
 * GET/POST /api/admin/allowlist
 *
 * Owner-only access to manage allowlisted emails.
 */

import { cookies } from 'next/headers';
import type { AllowedEmailRole } from '@/db/models';
import { getSessionFromCookies } from '@/lib/auth';
import {
  addAllowedEmail,
  ensureOwnerAllowlist,
  isValidEmail,
  listAllowedEmails,
  normalizeEmail,
} from '@/lib/auth/allowlist';
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface AllowlistRequestBody {
  email?: string;
  role?: AllowedEmailRole;
}

const ALLOWED_ROLES: AllowedEmailRole[] = ['family', 'friend'];
const OWNER_ROLE: AllowedEmailRole = 'owner';

export async function GET(): Promise<Response> {
  return withTrace('api.admin.allowlist.list', async () => {
    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    if (user.role !== OWNER_ROLE) {
      return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
    }

    await ensureOwnerAllowlist();

    const entries = await listAllowedEmails();

    return Response.json({ entries });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.admin.allowlist.add', async (span) => {
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

    let body: AllowlistRequestBody = {};
    try {
      body = (await request.json()) as AllowlistRequestBody;
    } catch {
      body = {};
    }

    const emailInput = body.email?.trim();
    const role = body.role;

    if (!(emailInput && role)) {
      span.setAttribute('error', 'invalid_payload');
      return Response.json({ error: 'invalid_payload' }, { status: HTTP_BAD_REQUEST });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      span.setAttribute('error', 'invalid_role');
      return Response.json({ error: 'invalid_role' }, { status: HTTP_BAD_REQUEST });
    }

    const email = normalizeEmail(emailInput);
    if (!isValidEmail(email)) {
      span.setAttribute('error', 'invalid_email');
      return Response.json({ error: 'invalid_email' }, { status: HTTP_BAD_REQUEST });
    }

    const entry = await addAllowedEmail({
      email,
      role,
    });

    logger.auth.info('Allowlist entry added', { email, role, addedBy: user.id });

    return Response.json({ entry });
  });
}
