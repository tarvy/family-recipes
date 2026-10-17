/**
 * GET /api/captures/[id]
 *
 * Return a capture's status. If the recipe was already written and the
 * lease expired, mark the capture saved. This does not start a new attempt.
 *
 * Auth: Bearer device key with scope captures:write.
 */

import { authenticateApiKey } from '@/lib/auth/api-key';
import { getCapture } from '@/lib/capture';
import { HTTP_NOT_FOUND } from '@/lib/constants/http-status';
import { withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';
import { apiKeyErrorResponse, captureFailureResponse, captureViewResponse } from '../response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.captures.get', async (span) => {
      const auth = await authenticateApiKey(request, 'captures:write');
      if (!auth.ok) {
        return apiKeyErrorResponse(auth.reason, span);
      }

      const { id } = await params;
      span.setAttribute('capture_id', id);
      try {
        const view = await getCapture(id);
        return view
          ? captureViewResponse(view, new URL(request.url).origin, span)
          : Response.json({ error: 'not_found' }, { status: HTTP_NOT_FOUND });
      } catch (error) {
        return captureFailureResponse('Capture read failed', error, span);
      }
    }),
  );
}
