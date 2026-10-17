/**
 * POST /api/captures
 *
 * Turn 1 to 4 photos or audio clips into a new or changed recipe.
 * Multipart fields: media (files), intent (add or change), slug, note.
 * Answers with the final result when it is ready within the inline wait,
 * otherwise 202 with a status URL.
 *
 * Auth: Bearer device key with scope captures:write.
 */

import { authenticateApiKey } from '@/lib/auth/api-key';
import { parseCaptureForm, submitCapture } from '@/lib/capture';
import { toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';
import {
  apiKeyErrorResponse,
  captureFailureResponse,
  captureInputErrorResponse,
  captureViewResponse,
} from './response';

export const runtime = 'nodejs';
/** after() inherits this budget. The capture lease must outlast it (tested). */
export const maxDuration = 60; // thailint: ignore[magic-numbers] - route segment config must be a literal

async function readForm(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch (error) {
    logger.capture.warn('Capture body is not multipart form data', {
      error: toErrorMessage(error),
    });
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.captures.create', async (span) => {
      const auth = await authenticateApiKey(request, 'captures:write');
      if (!auth.ok) {
        return apiKeyErrorResponse(auth.reason, span);
      }
      span.setAttribute('key_id', auth.principal.keyId);

      const form = await readForm(request);
      if (!form) {
        return captureInputErrorResponse(
          'no_media',
          'Send multipart/form-data with one to four "media" files.',
          span,
        );
      }
      const parsed = await parseCaptureForm(form);
      if (!parsed.ok) {
        return captureInputErrorResponse(parsed.code, parsed.message, span);
      }

      try {
        const view = await submitCapture(auth.principal, parsed.submission);
        return captureViewResponse(view, new URL(request.url).origin, span);
      } catch (error) {
        return captureFailureResponse('Capture submit failed', error, span);
      }
    }),
  );
}
