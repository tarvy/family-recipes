/**
 * POST /api/auth/send
 *
 * Send a magic link email to the provided email address.
 * Always returns 200 to prevent email enumeration attacks.
 */

import { generateMagicLink } from '@/lib/auth';
import {
  ensureOwnerAllowlist,
  findAllowedEmail,
  isValidEmail,
  normalizeEmail,
} from '@/lib/auth/allowlist';
import { toError } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface SendRequest {
  email?: string;
}

/** Extract and validate email from request body */
function extractValidEmail(body: SendRequest): string | null {
  const emailInput = body.email?.trim();
  if (!emailInput) {
    return null;
  }
  const email = normalizeEmail(emailInput);
  return isValidEmail(email) ? email : null;
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.auth.send', async (span) => {
      logger.api.info('Magic link send requested', { path: '/api/auth/send' });

      try {
        const body = (await request.json()) as SendRequest;
        const email = extractValidEmail(body);

        if (!email) {
          span.setAttribute('error', 'invalid_email');
          logger.auth.warn('Invalid email format provided');
          return Response.json({ success: true });
        }

        span.setAttribute('email', email);

        await ensureOwnerAllowlist();

        const allowed = await findAllowedEmail(email);
        if (!allowed) {
          logger.auth.warn('Magic link request rejected (not allowlisted)', { email });
          return Response.json({ success: true });
        }

        // Generate and send magic link
        const result = await generateMagicLink(email);

        if (!result.success) {
          // Log the error but still return 200 to prevent enumeration
          logger.auth.error('Magic link generation failed', undefined, {
            email,
            error: result.error,
          });
        }

        // Always return success to prevent email enumeration
        return Response.json({ success: true });
      } catch (error) {
        logger.api.error('Auth send endpoint error', toError(error));
        // Still return 200 to prevent enumeration
        return Response.json({ success: true });
      }
    }),
  );
}
