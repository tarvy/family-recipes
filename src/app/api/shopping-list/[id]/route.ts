/**
 * Shopping list API routes for individual lists
 *
 * GET    /api/shopping-list/[id]   - Get a shopping list
 * PATCH  /api/shopping-list/[id]   - Update (toggle item, add item)
 * DELETE /api/shopping-list/[id]   - Delete a shopping list
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
import {
  addManualItem,
  clearCheckedItems,
  deleteShoppingList,
  getShoppingList,
  toggleItem,
} from '@/lib/shopping/service';

const shoppingLogger = logger.shopping;

import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/shopping-list/[id]
 *
 * Get a shopping list by ID.
 */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.shopping-list.get', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      const { id } = await context.params;
      span.setAttribute('list_id', id);

      try {
        const result = await getShoppingList(id);

        if (!result) {
          span.setAttribute('error', 'not_found');
          return Response.json({ error: 'Shopping list not found' }, { status: HTTP_NOT_FOUND });
        }

        return Response.json({
          ...result,
          checkedItemIds: Array.from(result.checkedItemIds),
        });
      } catch (error) {
        shoppingLogger.error('Failed to get shopping list', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to get shopping list' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}

interface PatchRequest {
  action: 'toggleItem' | 'addItem' | 'clearChecked';
  itemId?: string;
  item?: { name: string; quantity?: string };
}

/** Serialize list result for JSON response */
function serializeListResult(result: Awaited<ReturnType<typeof getShoppingList>>) {
  if (!result) {
    return null;
  }
  return { ...result, checkedItemIds: Array.from(result.checkedItemIds) };
}

/** Handle toggleItem action */
async function handleToggleItem(id: string, itemId: string | undefined): Promise<Response> {
  if (!itemId) {
    return Response.json({ error: 'itemId is required' }, { status: HTTP_BAD_REQUEST });
  }
  const isChecked = await toggleItem(id, itemId);
  return Response.json({ success: true, isChecked });
}

/** Handle addItem action */
async function handleAddItem(
  id: string,
  item: { name: string; quantity?: string } | undefined,
): Promise<Response> {
  if (!item?.name) {
    return Response.json({ error: 'item.name is required' }, { status: HTTP_BAD_REQUEST });
  }
  await addManualItem(id, item);
  const updated = await getShoppingList(id);
  return Response.json({ success: true, list: serializeListResult(updated) });
}

/** Handle clearChecked action */
async function handleClearChecked(id: string): Promise<Response> {
  const removedCount = await clearCheckedItems(id);
  const updated = await getShoppingList(id);
  return Response.json({ success: true, removedCount, list: serializeListResult(updated) });
}

/** Handle PATCH error responses */
function handlePatchError(error: unknown, span: { setAttribute: (k: string, v: string) => void }) {
  const errorMessage = toErrorMessage(error);
  shoppingLogger.error('Failed to update shopping list', toError(error));
  span.setAttribute('error', errorMessage);

  if (errorMessage === 'Shopping list not found' || errorMessage === 'Item not found') {
    return Response.json({ error: errorMessage }, { status: HTTP_NOT_FOUND });
  }
  return Response.json(
    { error: 'Failed to update shopping list' },
    { status: HTTP_INTERNAL_SERVER_ERROR },
  );
}

/**
 * PATCH /api/shopping-list/[id]
 *
 * Update a shopping list. Supports:
 * - toggleItem: Toggle checked state of an item
 * - addItem: Add a manual item
 * - clearChecked: Remove all checked items
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.shopping-list.patch', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      const { id } = await context.params;
      span.setAttribute('list_id', id);

      try {
        const body = (await request.json()) as PatchRequest;
        span.setAttribute('action', body.action);

        switch (body.action) {
          case 'toggleItem':
            return handleToggleItem(id, body.itemId);
          case 'addItem':
            return handleAddItem(id, body.item);
          case 'clearChecked':
            return handleClearChecked(id);
          default:
            return Response.json({ error: 'Invalid action' }, { status: HTTP_BAD_REQUEST });
        }
      } catch (error) {
        return handlePatchError(error, span);
      }
    }),
  );
}

/**
 * DELETE /api/shopping-list/[id]
 *
 * Delete a shopping list.
 */
export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.shopping-list.delete', async (span) => {
      const cookieStore = await cookies();
      const user = await getSessionFromCookies(cookieStore);

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      const { id } = await context.params;
      span.setAttribute('list_id', id);

      try {
        await deleteShoppingList(id);
        shoppingLogger.info('Shopping list deleted', { listId: id, userId: user.id });
        return Response.json({ success: true });
      } catch (error) {
        shoppingLogger.error('Failed to delete shopping list', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to delete shopping list' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
