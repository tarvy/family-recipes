/**
 * POST /api/auth/send
 *
 * Send a magic link email to the provided email address.
 * Always returns 200 to prevent email enumeration attacks.
 */

import { generateMagicLink } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface SendRequest {
  email?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.auth.send', async (span) => {
    logger.api.info('Magic link send requested', { path: '/api/auth/send' });

    try {
      const body = (await request.json()) as SendRequest;
      const email = body.email?.trim().toLowerCase();

      // Validate email format
      if (!(email && EMAIL_REGEX.test(email))) {
        span.setAttribute('error', 'invalid_email');
        logger.auth.warn('Invalid email format provided');
        // Still return 200 to prevent enumeration
        return Response.json({ success: true });
      }

      span.setAttribute('email', email);

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
      logger.api.error('Auth send endpoint error', error instanceof Error ? error : undefined);
      // Still return 200 to prevent enumeration
      return Response.json({ success: true });
    }
  });
}
