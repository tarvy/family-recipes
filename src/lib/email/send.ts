/**
 * Email sender using Resend
 *
 * Usage:
 *   import { sendEmail } from '@/lib/email/send';
 *
 *   await sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Your magic link',
 *     html: '<p>Click <a href="...">here</a> to sign in</p>',
 *   });
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

let resend: Resend | null = null;

/**
 * Get or create the Resend client (lazy initialization)
 */
function getResendClient(): Resend {
  if (resend) {
    return resend;
  }

  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  resend = new Resend(apiKey);
  return resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Default sender for Resend free tier
 */
const RESEND_FREE_TIER_SENDER = 'onboarding@resend.dev';

/**
 * Get the sender email address.
 * Uses RESEND_FROM_EMAIL env var if set, otherwise falls back to Resend free tier sender.
 */
function getSenderEmail(): string {
  return process.env['RESEND_FROM_EMAIL'] || RESEND_FREE_TIER_SENDER;
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  return withTrace('email.send', async (span) => {
    const from = getSenderEmail();

    span.setAttributes({
      'email.to': options.to,
      'email.subject': options.subject,
      'email.from': from,
    });

    logger.auth.info('Sending email', {
      to: options.to,
      subject: options.subject,
      from,
    });

    try {
      const emailPayload = {
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text !== undefined && { text: options.text }),
      };

      const { error } = await getResendClient().emails.send(emailPayload);

      if (error) {
        logger.auth.error('Failed to send email', new Error(error.message), {
          to: options.to,
          errorCode: error.name,
        });
        return { success: false, error: error.message };
      }

      logger.auth.info('Email sent successfully', { to: options.to });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.auth.error('Email send threw exception', error instanceof Error ? error : undefined, {
        to: options.to,
      });
      return { success: false, error: errorMessage };
    }
  });
}
