/**
 * POST /api/shopping-list
 *
 * Create a new shopping list from selected recipes.
 *
 * Request body:
 * {
 *   name?: string,
 *   recipeSlugs: string[],
 *   servingsMultipliers?: Record<string, number>
 * }
 */

import { Types } from 'mongoose';
import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth/session';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { createShoppingList } from '@/lib/shopping/service';

const shoppingLogger = logger.shopping;

import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface CreateListRequest {
  name?: string;
  recipeSlugs: string[];
  servingsMultipliers?: Record<string, number>;
}

/**
 * Validate the request body
 */
function validateRequest(
  body: unknown,
): { valid: true; data: CreateListRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data['recipeSlugs'])) {
    return { valid: false, error: 'recipeSlugs must be an array' };
  }

  if (data['recipeSlugs'].length === 0) {
    return { valid: false, error: 'At least one recipe is required' };
  }

  const allStrings = data['recipeSlugs'].every((s) => typeof s === 'string');
  if (!allStrings) {
    return { valid: false, error: 'recipeSlugs must contain strings' };
  }

  if (data['name'] !== undefined && typeof data['name'] !== 'string') {
    return { valid: false, error: 'name must be a string' };
  }

  if (data['servingsMultipliers'] !== undefined) {
    if (typeof data['servingsMultipliers'] !== 'object' || data['servingsMultipliers'] === null) {
      return { valid: false, error: 'servingsMultipliers must be an object' };
    }
  }

  return { valid: true, data: data as unknown as CreateListRequest };
}

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.shopping-list.create', async (span) => {
    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
    }

    span.setAttribute('user_id', user.id);

    try {
      const body = await request.json();
      const validation = validateRequest(body);

      if (!validation.valid) {
        span.setAttribute('error', 'validation_failed');
        return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
      }

      const data = validation.data;
      span.setAttribute('recipe_count', data.recipeSlugs.length);

      const result = await createShoppingList({
        name: data.name,
        recipeSlugs: data.recipeSlugs,
        servingsMultipliers: data.servingsMultipliers,
        userId: new Types.ObjectId(user.id),
      });

      shoppingLogger.info('Shopping list created', {
        listId: result.id,
        recipeCount: result.recipeCount,
        itemCount: result.itemCount,
        userId: user.id,
      });

      // Convert Set to array for JSON serialization
      return Response.json({
        ...result,
        checkedItemIds: Array.from(result.checkedItemIds),
      });
    } catch (error) {
      shoppingLogger.error(
        'Failed to create shopping list',
        error instanceof Error ? error : undefined,
      );
      span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
      return Response.json(
        { error: 'Failed to create shopping list' },
        { status: HTTP_INTERNAL_SERVER_ERROR },
      );
    }
  });
}
