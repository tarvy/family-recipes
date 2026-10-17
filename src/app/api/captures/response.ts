/**
 * HTTP mapping shared by the capture routes. Status codes, headers, and URLs
 * are transport, so they live here rather than in lib/capture.
 */

import type { ApiKeyFailure } from '@/lib/auth/api-key';
import type { CaptureInputErrorCode, CaptureView } from '@/lib/capture';
import {
  HTTP_ACCEPTED,
  HTTP_BAD_REQUEST,
  HTTP_CONTENT_TOO_LARGE,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
  HTTP_UNSUPPORTED_MEDIA_TYPE,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { MinimalSpan } from '@/lib/telemetry';

const RETRY_AFTER_SECONDS = 15;

export function apiKeyErrorResponse(reason: ApiKeyFailure, span: MinimalSpan): Response {
  span.setAttribute('error', reason);
  switch (reason) {
    case 'missing':
    case 'invalid':
      return Response.json(
        { error: reason },
        { status: HTTP_UNAUTHORIZED, headers: { 'WWW-Authenticate': 'Bearer' } },
      );
    case 'insufficient_scope':
    case 'forbidden_role':
      return Response.json({ error: reason }, { status: HTTP_FORBIDDEN });
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}

function inputErrorStatus(code: CaptureInputErrorCode): number {
  switch (code) {
    case 'too_large':
      return HTTP_CONTENT_TOO_LARGE;
    case 'unsupported_media_type':
      return HTTP_UNSUPPORTED_MEDIA_TYPE;
    case 'no_media':
    case 'too_many_media':
    case 'bad_intent':
    case 'bad_slug':
    case 'note_too_long':
      return HTTP_BAD_REQUEST;
    default: {
      const unreachable: never = code;
      return unreachable;
    }
  }
}

export function captureInputErrorResponse(
  code: CaptureInputErrorCode,
  message: string,
  span: MinimalSpan,
): Response {
  span.setAttribute('error', code);
  return Response.json({ error: code, message }, { status: inputErrorStatus(code) });
}

/** working is 202 with Location and Retry-After. Every settled view is 200. */
export function captureViewResponse(
  view: CaptureView,
  origin: string,
  span: MinimalSpan,
): Response {
  span.setAttributes({ capture_id: view.id, capture_status: view.status });
  const statusUrl = `${origin}/api/captures/${view.id}`;
  switch (view.status) {
    case 'working':
      return Response.json(
        { ...view, statusUrl },
        {
          status: HTTP_ACCEPTED,
          headers: { Location: statusUrl, 'Retry-After': String(RETRY_AFTER_SECONDS) },
        },
      );
    case 'saved':
      return Response.json({
        ...view,
        statusUrl,
        recipeUrl: `${origin}/recipes/${view.recipe.slug}`,
      });
    case 'needs_attention':
    case 'failed':
      return Response.json({ ...view, statusUrl });
    default: {
      const unreachable: never = view;
      return unreachable;
    }
  }
}

export function captureFailureResponse(
  message: string,
  error: unknown,
  span: MinimalSpan,
): Response {
  logger.capture.error(message, toError(error));
  span.setAttribute('error', toErrorMessage(error));
  return Response.json({ error: 'capture_failed' }, { status: HTTP_INTERNAL_SERVER_ERROR });
}
