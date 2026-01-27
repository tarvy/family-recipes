/**
 * POST /api/invite
 *
 * Create an allowlist invitation for a new user.
 */

import { cookies } from 'next/headers';
import type { AllowedEmailRole } from '@/db/models';
import { getSessionFromCookies } from '@/lib/auth';
import {
  addAllowedEmail,
  ensureOwnerAllowlist,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth/allowlist';
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface InviteRequestBody {
  email?: string;
  role?: AllowedEmailRole;
}

interface InvitePayload {
  email: string;
  role: AllowedEmailRole;
}

const OWNER_ROLE: AllowedEmailRole = 'owner';
const FAMILY_ROLE: AllowedEmailRole = 'family';
const FRIEND_ROLE: AllowedEmailRole = 'friend';
const INVITABLE_ROLES: AllowedEmailRole[] = [FAMILY_ROLE, FRIEND_ROLE];

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.invite.create', async (span) => {
    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    if (!(user.role === OWNER_ROLE || user.role === FAMILY_ROLE)) {
      span.setAttribute('error', 'forbidden');
      return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
    }

    await ensureOwnerAllowlist();

    const payload = await parseInvitePayload(request, span);
    if ('response' in payload) {
      return payload.response;
    }

    if (!canInvite(user.role, payload.role)) {
      span.setAttribute('error', 'forbidden_role');
      return Response.json({ error: 'forbidden_role' }, { status: HTTP_FORBIDDEN });
    }

    const entry = await addAllowedEmail({
      email: payload.email,
      role: payload.role,
      invitedBy: user.id,
    });

    logger.auth.info('Invite created', {
      email: payload.email,
      role: payload.role,
      invitedBy: user.id,
    });

    return Response.json({ entry });
  });
}

function canInvite(inviterRole: AllowedEmailRole, inviteRole: AllowedEmailRole): boolean {
  if (inviterRole === OWNER_ROLE) {
    return INVITABLE_ROLES.includes(inviteRole);
  }

  if (inviterRole === FAMILY_ROLE) {
    return inviteRole === FRIEND_ROLE;
  }

  return false;
}

async function parseInvitePayload(
  request: Request,
  span: { setAttribute: (key: string, value: string) => void },
): Promise<InvitePayload | { response: Response }> {
  let body: InviteRequestBody = {};
  try {
    body = (await request.json()) as InviteRequestBody;
  } catch {
    body = {};
  }

  const emailInput = body.email?.trim();
  const role = body.role;

  if (!(emailInput && role)) {
    span.setAttribute('error', 'invalid_payload');
    return { response: Response.json({ error: 'invalid_payload' }, { status: HTTP_BAD_REQUEST }) };
  }

  if (!INVITABLE_ROLES.includes(role)) {
    span.setAttribute('error', 'invalid_role');
    return { response: Response.json({ error: 'invalid_role' }, { status: HTTP_BAD_REQUEST }) };
  }

  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    span.setAttribute('error', 'invalid_email');
    return { response: Response.json({ error: 'invalid_email' }, { status: HTTP_BAD_REQUEST }) };
  }

  return { email, role };
}
