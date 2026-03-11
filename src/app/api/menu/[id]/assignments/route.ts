/** POST + DELETE /api/menu/[id]/assignments */

import { cookies } from 'next/headers';
import { isFamilyRole } from '@/lib/auth/authorization';
import { getSessionFromCookies, type SessionUser } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import {
  type AddAssignmentInput,
  addAssignment,
  MenuError,
  menuErrorHttpStatus,
  removeAssignment,
} from '@/lib/menu/service';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type SpanLike = { setAttribute: (key: string, value: string) => void };

async function requireFamilyUser(span: SpanLike): Promise<Response | SessionUser> {
  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);
  if (!user) {
    span.setAttribute('error', 'unauthorized');
    return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
  }
  if (!isFamilyRole(user.role)) {
    span.setAttribute('error', 'forbidden');
    return Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN });
  }
  return user;
}

const VALID_SOURCES = new Set(['cookbook', 'discovery']);
const VALID_DAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const VALID_MEAL_SLOTS = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

function buildAssignmentInput(data: Record<string, unknown>): AddAssignmentInput {
  const input: AddAssignmentInput = {
    title: data['title'] as string,
    source: data['source'] as 'cookbook' | 'discovery',
    day: data['day'] as 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  };
  if (typeof data['recipeId'] === 'string') {
    input.recipeId = data['recipeId'];
  }
  if (typeof data['discoveryRecipeId'] === 'string') {
    input.discoveryRecipeId = data['discoveryRecipeId'];
  }
  if (typeof data['thumbnailUrl'] === 'string') {
    input.thumbnailUrl = data['thumbnailUrl'];
  }
  if (typeof data['mealSlot'] === 'string' && VALID_MEAL_SLOTS.has(data['mealSlot'])) {
    input.mealSlot = data['mealSlot'] as 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }
  return input;
}

function validateAssignmentBody(
  body: unknown,
): { valid: true; data: AddAssignmentInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  if (typeof data['title'] !== 'string' || !data['title']) {
    return { valid: false, error: 'title is required' };
  }
  if (!VALID_SOURCES.has(data['source'] as string)) {
    return { valid: false, error: 'source must be "cookbook" or "discovery"' };
  }
  if (!VALID_DAYS.has(data['day'] as string)) {
    return { valid: false, error: 'day must be mon-sun' };
  }
  if (data['mealSlot'] !== undefined && !VALID_MEAL_SLOTS.has(data['mealSlot'] as string)) {
    return { valid: false, error: 'mealSlot must be breakfast, lunch, dinner, or snack' };
  }

  return { valid: true, data: buildAssignmentInput(data) };
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.addAssignment', async (span) => {
      const { id } = await params;
      span.setAttribute('menu_id', id);

      const authResult = await requireFamilyUser(span);
      if (authResult instanceof Response) {
        return authResult;
      }
      span.setAttribute('user_id', authResult.id);

      try {
        const body = await request.json();
        const validation = validateAssignmentBody(body);
        if (!validation.valid) {
          span.setAttribute('error', 'validation_failed');
          return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
        }

        const updated = await addAssignment(id, validation.data);
        const newAssignment = updated.assignments[updated.assignments.length - 1];
        return Response.json({ assignment: newAssignment });
      } catch (error) {
        if (error instanceof MenuError) {
          span.setAttribute('error', error.code);
          return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
        }
        logger.api.error('Failed to add assignment', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to add assignment' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}

async function handleRemoveAssignment(
  request: Request,
  menuId: string,
  span: SpanLike,
): Promise<Response> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const assignmentId = typeof body['assignmentId'] === 'string' ? body['assignmentId'] : '';
    if (!assignmentId) {
      return Response.json({ error: 'assignmentId is required' }, { status: HTTP_BAD_REQUEST });
    }

    await removeAssignment(menuId, assignmentId);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof MenuError) {
      span.setAttribute('error', error.code);
      return Response.json({ error: error.message }, { status: menuErrorHttpStatus(error) });
    }
    logger.api.error('Failed to remove assignment', toError(error));
    span.setAttribute('error', toErrorMessage(error));
    return Response.json(
      { error: 'Failed to remove assignment' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.menu.removeAssignment', async (span) => {
      const { id } = await params;
      span.setAttribute('menu_id', id);

      const authResult = await requireFamilyUser(span);
      if (authResult instanceof Response) {
        return authResult;
      }
      span.setAttribute('user_id', authResult.id);

      return handleRemoveAssignment(request, id, span);
    }),
  );
}
