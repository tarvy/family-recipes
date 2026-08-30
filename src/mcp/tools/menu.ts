/**
 * MCP weekly meal-plan menu tools.
 *
 * Thin wrappers over `@/lib/menu/service`, mirroring the semantics of the
 * `/api/menu` REST routes so AI clients can build and finalize weekly dinner
 * plans through the connector. The acting owner defaults to OWNER_EMAIL, the
 * single-user default for this app.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Types } from 'mongoose';
import * as z from 'zod';
import type { IWeeklyMenuAssignment } from '@/db/types';
import { logger } from '@/lib/logger';
import {
  addAssignment,
  finalizeMenu,
  getOrCreateMenuForWeek,
  removeAssignment,
  sendSurvey,
} from '@/lib/menu/service';
import { getRecipeBySlug } from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';
import { buildToolResult, resolveMcpUser } from '@/mcp/tools/utils';

const assignmentOutputSchema = z.object({
  assignmentId: z.string(),
  title: z.string(),
  source: z.enum(['cookbook', 'discovery']),
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  recipeId: z.string().optional(),
});

const menuOutputSchema = z.object({
  id: z.string(),
  weekLabel: z.string(),
  status: z.enum(['building', 'survey-sent', 'locked-in']),
  weekStartDate: z.string(),
  assignments: z.array(assignmentOutputSchema),
});

/** A menu assignment as stored in a mongoose subdocument (carries an _id). */
type StoredAssignment = IWeeklyMenuAssignment & { _id: Types.ObjectId };

/** Structural shape of a persisted menu, enough to serialize for output. */
interface SerializableMenu {
  _id: Types.ObjectId;
  weekLabel: string;
  status: 'building' | 'survey-sent' | 'locked-in';
  weekStartDate: Date;
  assignments: StoredAssignment[];
}

function serializeMenu(menu: SerializableMenu) {
  return {
    id: menu._id.toString(),
    weekLabel: menu.weekLabel,
    status: menu.status,
    weekStartDate: menu.weekStartDate.toISOString(),
    assignments: menu.assignments.map((assignment) => ({
      assignmentId: assignment._id.toString(),
      title: assignment.title,
      source: assignment.source,
      day: assignment.day,
      mealSlot: assignment.mealSlot,
      recipeId: assignment.recipeId?.toString(),
    })),
  };
}

function registerGetWeek(server: McpServer): void {
  server.registerTool(
    'menu_get_week',
    {
      title: 'Get weekly menu',
      description:
        'Get the meal-plan menu for a week, creating an empty one if none exists. ' +
        'Omit weekLabel for the current week (weekLabel format: YYYY-Www, e.g. 2026-W35).',
      inputSchema: {
        weekLabel: z.string().optional().describe('ISO week label like 2026-W35; defaults to now'),
        userEmail: z.string().optional().describe('Owner email (defaults to OWNER_EMAIL)'),
      },
      outputSchema: menuOutputSchema.shape,
    },
    async ({ weekLabel, userEmail }) => {
      return withTrace('mcp.tool.menu_get_week', async (span) => {
        const owner = await resolveMcpUser(userEmail);
        const menu = await getOrCreateMenuForWeek(owner.id.toString(), weekLabel);
        span.setAttribute('menu_id', menu._id.toString());
        logger.mcp.info('MCP menu_get_week executed', { menuId: menu._id.toString() });
        return buildToolResult(serializeMenu(menu as unknown as SerializableMenu));
      });
    },
  );
}

function registerAddDinner(server: McpServer): void {
  server.registerTool(
    'menu_add_dinner',
    {
      title: 'Add a recipe to the weekly menu',
      description:
        'Add a cookbook recipe (by slug) to a day of the weekly menu. ' +
        'Creates the week if needed. Menu must be in "building" status.',
      inputSchema: {
        recipeSlug: z.string().describe('Slug of the cookbook recipe to add'),
        day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).describe('Day of the week'),
        mealSlot: z
          .enum(['breakfast', 'lunch', 'dinner', 'snack'])
          .optional()
          .describe('Meal slot (defaults to dinner)'),
        weekLabel: z.string().optional().describe('ISO week label; defaults to the current week'),
        userEmail: z.string().optional().describe('Owner email (defaults to OWNER_EMAIL)'),
      },
      outputSchema: menuOutputSchema.shape,
    },
    async ({ recipeSlug, day, mealSlot, weekLabel, userEmail }) => {
      return withTrace('mcp.tool.menu_add_dinner', async (span) => {
        span.setAttribute('recipe_slug', recipeSlug);
        const owner = await resolveMcpUser(userEmail);
        const recipe = await getRecipeBySlug(recipeSlug);
        if (!recipe) {
          throw new Error(`Recipe not found: ${recipeSlug}`);
        }

        const menu = await getOrCreateMenuForWeek(owner.id.toString(), weekLabel);
        const updated = await addAssignment(menu._id.toString(), {
          recipeId: recipe._id.toString(),
          title: recipe.title,
          source: 'cookbook',
          day,
          mealSlot: mealSlot ?? 'dinner',
        });

        logger.mcp.info('MCP menu_add_dinner executed', {
          menuId: menu._id.toString(),
          recipeSlug,
          day,
        });
        return buildToolResult(serializeMenu(updated as unknown as SerializableMenu));
      });
    },
  );
}

function registerRemoveAssignment(server: McpServer): void {
  server.registerTool(
    'menu_remove_assignment',
    {
      title: 'Remove a menu assignment',
      description:
        'Remove a recipe from the weekly menu by its assignmentId ' +
        '(from menu_get_week). Menu must be in "building" status.',
      inputSchema: {
        menuId: z.string().describe('Menu id'),
        assignmentId: z.string().describe('Assignment id to remove'),
      },
      outputSchema: menuOutputSchema.shape,
    },
    async ({ menuId, assignmentId }) => {
      return withTrace('mcp.tool.menu_remove_assignment', async (span) => {
        span.setAttribute('menu_id', menuId);
        const updated = await removeAssignment(menuId, assignmentId);
        logger.mcp.info('MCP menu_remove_assignment executed', { menuId, assignmentId });
        return buildToolResult(serializeMenu(updated as unknown as SerializableMenu));
      });
    },
  );
}

function registerSendSurvey(server: McpServer): void {
  server.registerTool(
    'menu_send_survey',
    {
      title: 'Open voting on the weekly menu',
      description:
        'Transition a menu from "building" to "survey-sent" and open family voting. ' +
        'Required before menu_finalize. Returns the voting URL.',
      inputSchema: {
        menuId: z.string().describe('Menu id'),
      },
      outputSchema: {
        votingToken: z.string(),
        votingUrl: z.string(),
      },
    },
    async ({ menuId }) => {
      return withTrace('mcp.tool.menu_send_survey', async (span) => {
        span.setAttribute('menu_id', menuId);
        const result = await sendSurvey(menuId);
        logger.mcp.info('MCP menu_send_survey executed', { menuId });
        return buildToolResult({
          votingToken: result.votingToken,
          votingUrl: result.votingUrl,
        });
      });
    },
  );
}

function registerFinalize(server: McpServer): void {
  server.registerTool(
    'menu_finalize',
    {
      title: 'Finalize the weekly menu',
      description:
        'Lock in a menu (from "survey-sent" status) and generate its shopping list. ' +
        'Returns the shopping list id and any excluded-recipe alerts.',
      inputSchema: {
        menuId: z.string().describe('Menu id'),
        userEmail: z.string().optional().describe('Owner email (defaults to OWNER_EMAIL)'),
      },
      outputSchema: {
        menuId: z.string(),
        status: z.literal('locked-in'),
        shoppingListId: z.string(),
        alerts: z.array(z.object({ recipeTitle: z.string(), reason: z.string() })),
      },
    },
    async ({ menuId, userEmail }) => {
      return withTrace('mcp.tool.menu_finalize', async (span) => {
        span.setAttribute('menu_id', menuId);
        const owner = await resolveMcpUser(userEmail);
        const result = await finalizeMenu(menuId, owner.id.toString());
        logger.mcp.info('MCP menu_finalize executed', {
          menuId,
          shoppingListId: result.shoppingListId,
        });
        return buildToolResult({
          menuId,
          status: 'locked-in' as const,
          shoppingListId: result.shoppingListId,
          alerts: result.alerts,
        });
      });
    },
  );
}

export function registerMenuTools(server: McpServer): void {
  registerGetWeek(server);
  registerAddDinner(server);
  registerRemoveAssignment(server);
  registerSendSurvey(server);
  registerFinalize(server);
}

// Exported for unit tests.
export { serializeMenu };
export type { SerializableMenu, StoredAssignment };
