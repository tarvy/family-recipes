/**
 * MCP shopping list tools.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Types } from 'mongoose';
import * as z from 'zod';
import { connectDB } from '@/db/connection';
import { User } from '@/db/models';
import { isValidEmail, normalizeEmail } from '@/lib/auth/allowlist';
import { logger } from '@/lib/logger';
import {
  createShoppingList,
  getShoppingList,
  type ShoppingListResult,
} from '@/lib/shopping/service';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import { buildToolResult } from '@/mcp/tools/utils';

const USER_COLLECTION = 'users';
const SHOPPING_COLLECTION = 'shopping_lists';
const SERVINGS_MULTIPLIER_MIN = 0;

const quantitySourceSchema = z.object({
  amount: z.number().nullable(),
  unit: z.string(),
  recipeSlug: z.string(),
});

const aggregatedIngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantities: z.array(quantitySourceSchema),
  displayQuantity: z.string(),
  category: z.string(),
});

const shoppingListSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(aggregatedIngredientSchema),
  itemsByCategory: z.record(z.string(), z.array(aggregatedIngredientSchema)),
  categoriesWithItems: z.array(z.string()),
  recipeCount: z.number(),
  itemCount: z.number(),
  checkedItemIds: z.array(z.string()),
});

interface ResolvedUser {
  id: Types.ObjectId;
  email: string;
}

async function resolveUser(userEmail?: string): Promise<ResolvedUser> {
  const email = userEmail?.trim() || process.env.OWNER_EMAIL?.trim();
  if (!email) {
    throw new Error('User email is required');
  }

  if (!isValidEmail(email)) {
    throw new Error('User email is invalid');
  }

  await connectDB();

  const normalized = normalizeEmail(email);
  const user = await traceDbQuery('findOne', USER_COLLECTION, async () => {
    return User.findOne({ email: normalized });
  });

  if (!user) {
    throw new Error('User not found for MCP request');
  }

  return {
    id: user._id as Types.ObjectId,
    email: user.email,
  };
}

function toShoppingListOutput(result: ShoppingListResult) {
  return {
    ...result,
    checkedItemIds: Array.from(result.checkedItemIds),
  };
}

export function registerShoppingTools(server: McpServer): void {
  server.registerTool(
    'shopping_list_create',
    {
      title: 'Create shopping list',
      description: 'Create a shopping list from recipe slugs.',
      inputSchema: {
        name: z.string().optional().describe('Optional shopping list name'),
        recipeSlugs: z.array(z.string()).min(1).describe('Recipe slugs to include'),
        servingsMultipliers: z
          .record(z.string(), z.number().min(SERVINGS_MULTIPLIER_MIN))
          .optional()
          .describe('Optional servings multiplier by recipe slug'),
        userEmail: z.string().optional().describe('Optional user email (defaults to OWNER_EMAIL)'),
      },
      outputSchema: shoppingListSchema,
    },
    async ({ name, recipeSlugs, servingsMultipliers, userEmail }) => {
      return withTrace('mcp.tool.shopping_list_create', async (span) => {
        span.setAttribute('recipe_count', recipeSlugs.length);

        const user = await resolveUser(userEmail);
        span.setAttribute('user_email', user.email);

        const result = await traceDbQuery('create', SHOPPING_COLLECTION, async () => {
          return createShoppingList({
            name,
            recipeSlugs,
            servingsMultipliers,
            userId: user.id,
          });
        });

        const output = toShoppingListOutput(result);

        logger.mcp.info('MCP shopping_list_create executed', {
          listId: output.id,
          recipeCount: output.recipeCount,
        });

        return buildToolResult(output);
      });
    },
  );

  server.registerTool(
    'shopping_list_get',
    {
      title: 'Get shopping list',
      description: 'Fetch a shopping list by id.',
      inputSchema: {
        id: z.string().describe('Shopping list id'),
      },
      outputSchema: {
        found: z.boolean(),
        list: shoppingListSchema.optional(),
      },
    },
    async ({ id }) => {
      return withTrace('mcp.tool.shopping_list_get', async (span) => {
        span.setAttribute('list_id', id);

        await connectDB();

        const result = await traceDbQuery('findById', SHOPPING_COLLECTION, async () => {
          return getShoppingList(id);
        });

        if (!result) {
          logger.mcp.warn('MCP shopping_list_get not found', { id });
          return buildToolResult({ found: false });
        }

        const output = toShoppingListOutput(result);

        logger.mcp.info('MCP shopping_list_get executed', {
          listId: output.id,
        });

        return buildToolResult({ found: true, list: output });
      });
    },
  );
}
