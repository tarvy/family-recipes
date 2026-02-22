/**
 * Cook log API route
 *
 * POST /api/recipes/[slug]/cook-log - Add a cook log entry
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { addCookLogEntry } from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Maximum length for cook log notes */
const MAX_NOTE_LENGTH = 500;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Validate and extract the optional note from the request body.
 * Returns the trimmed note (or undefined) or an error string.
 */
function validateNote(
  body: unknown,
): { valid: true; note: string | undefined } | { valid: false; error: string } {
  if (body !== null && typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = (body ?? {}) as Record<string, unknown>;
  const note = data['note'];

  if (note !== undefined && note !== null && typeof note !== 'string') {
    return { valid: false, error: 'Note must be a string' };
  }

  const trimmed = typeof note === 'string' ? note.trim() : undefined;

  if (trimmed !== undefined && trimmed.length > MAX_NOTE_LENGTH) {
    return { valid: false, error: `Note must be ${MAX_NOTE_LENGTH} characters or less` };
  }

  return { valid: true, note: trimmed || undefined };
}

/**
 * POST /api/recipes/[slug]/cook-log
 *
 * Add a cook log entry with an optional note.
 * Body: { note?: string }
 */
export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.cookLog', async (span) => {
      const { slug } = await params;
      span.setAttribute('slug', slug);

      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      span.setAttribute('user_id', user.id);

      try {
        const body: unknown = await request.json();
        const validation = validateNote(body);

        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
        }

        const updated = await addCookLogEntry(slug, validation.note);

        if (!updated) {
          span.setAttribute('error', 'not_found');
          return Response.json({ error: 'Recipe not found' }, { status: HTTP_NOT_FOUND });
        }

        logger.recipes.info('Cook log entry added via API', { slug, userId: user.id });
        return Response.json({ success: true });
      } catch (error) {
        logger.recipes.error('Failed to add cook log entry', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to add cook log entry' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
