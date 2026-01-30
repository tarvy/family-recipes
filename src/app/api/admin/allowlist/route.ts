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
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface AllowlistRequestBody {
  email?: string;
  role?: AllowedEmailRole;
}

const ALLOWED_ROLES: AllowedEmailRole[] = ['family', 'friend'];
const OWNER_ROLE: AllowedEmailRole = 'owner';

interface ValidatedAllowlistEntry {
  email: string;
  role: AllowedEmailRole;
}

type AllowlistValidationResult =
  | { valid: true; data: ValidatedAllowlistEntry }
  | { valid: false; error: string };

/** Validate and normalize allowlist request body */
function validateAllowlistBody(body: AllowlistRequestBody): AllowlistValidationResult {
  const emailInput = body.email?.trim();
  const role = body.role;

  if (!(emailInput && role)) {
    return { valid: false, error: 'invalid_payload' };
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return { valid: false, error: 'invalid_role' };
  }

  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { valid: false, error: 'invalid_email' };
  }

  return { valid: true, data: { email, role } };
}

export async function GET(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.admin.allowlist.list', async () => {
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
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.admin.allowlist.add', async (span) => {
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

      const validation = validateAllowlistBody(body);
      if (!validation.valid) {
        span.setAttribute('error', validation.error);
        return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
      }

      const { email, role } = validation.data;
      const entry = await addAllowedEmail({ email, role });

      logger.auth.info('Allowlist entry added', { email, role, addedBy: user.id });

      return Response.json({ entry });
    }),
  );
}
