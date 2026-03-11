/** Menu business logic and state machine for weekly meal planning. */

import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { DiscoveryRecipe, Recipe, ShoppingList } from '@/db/models';
import type { IDiscoveryRecipe, IIngredient, IShoppingListItem } from '@/db/types';
import { createLogger } from '@/lib/logger';
import { validateDiscoveryIngredients } from '@/lib/menu/ingredient-validator';
import type { AddAssignmentInput } from '@/lib/menu/repository';
import {
  clearVotes,
  deleteShoppingListById,
  findById,
  findByWeek,
  findOrCreateForWeek,
  addAssignment as repoAddAssignment,
  create as repoCreate,
  deleteMenu as repoDeleteMenu,
  removeAssignment as repoRemoveAssignment,
  updateStatus,
} from '@/lib/menu/repository';
import { getCurrentWeekLabel, parseWeekLabel } from '@/lib/menu/week-utils';
import { aggregateIngredients, type RecipeIngredients } from '@/lib/shopping/aggregator';
import { withTrace } from '@/lib/telemetry';

const log = createLogger('menu');

/** Hours the voting window stays open. */
const VOTING_WINDOW_HOURS = 24;

/** Milliseconds per hour. */
const MS_PER_HOUR = 3_600_000;

/** Days in a week for ISO week calculations. */
const DAYS_PER_WEEK = 7;

/** January 4 is always in ISO week 1 (ISO 8601 definition). */
const ISO_WEEK_ANCHOR_DAY = 4;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const MENU_ERROR_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  BAD_REQUEST: 400,
};

const DEFAULT_ERROR_STATUS = 500;

/** Error thrown by menu service for known business-rule violations. */
export class MenuError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST',
  ) {
    super(message);
    this.name = 'MenuError';
  }
}

export function menuErrorHttpStatus(error: MenuError): number {
  return MENU_ERROR_STATUS[error.code] ?? DEFAULT_ERROR_STATUS;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Alert for a discovery recipe excluded during finalization. */
export interface FinalizeAlert {
  recipeTitle: string;
  reason: string;
}

/** Result of menu finalization. */
export interface FinalizeResult {
  shoppingListId: string;
  alerts: FinalizeAlert[];
}

/** Returned after opening a voting survey. */
export interface SurveyResult {
  votingToken: string;
  votingUrl: string;
}

// Re-export for route convenience
export type { AddAssignmentInput } from '@/lib/menu/repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the Monday of a given ISO week label (e.g. "2026-W15").
 */
function weekLabelToStartDate(weekLabel: string): Date {
  const { year, week } = parseWeekLabel(weekLabel);
  // January 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, ISO_WEEK_ANCHOR_DAY));
  const dayOfWeek = jan4.getUTCDay() || DAYS_PER_WEEK;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const target = new Date(mondayWeek1);
  target.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * DAYS_PER_WEEK);
  target.setUTCHours(0, 0, 0, 0);
  return target;
}

// ---------------------------------------------------------------------------
// Menu CRUD
// ---------------------------------------------------------------------------

export async function getMenuById(menuId: string) {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  return menu;
}

export async function getOrCreateMenuForWeek(ownerId: string, weekLabel?: string) {
  const label = weekLabel ?? getCurrentWeekLabel();
  const startDate = weekLabelToStartDate(label);
  return findOrCreateForWeek(ownerId, label, startDate);
}

/**
 * Create a menu for a specific week. Fails if one already exists.
 */
export async function createMenuForWeek(ownerId: string, weekLabel: string) {
  // Validate format — throws if invalid
  parseWeekLabel(weekLabel);
  const startDate = weekLabelToStartDate(weekLabel);

  const existing = await findByWeek(ownerId, weekLabel);
  if (existing) {
    throw new MenuError(`Menu already exists for week ${weekLabel}`, 'CONFLICT');
  }

  return repoCreate(ownerId, weekLabel, startDate);
}

/**
 * Delete a menu. Only allowed when status is "building" or "survey-sent".
 */
export async function deleteMenu(menuId: string): Promise<void> {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status === 'locked-in') {
    throw new MenuError('Cannot delete a locked-in menu. Unlock it first.', 'CONFLICT');
  }
  log.info('Deleting menu', { menuId, weekLabel: menu.weekLabel });
  await repoDeleteMenu(menuId);
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

/**
 * Add a recipe assignment. Menu must be in "building" status.
 */
export async function addAssignment(menuId: string, input: AddAssignmentInput) {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status !== 'building') {
    throw new MenuError('Assignments can only be modified on menus in building status', 'CONFLICT');
  }

  const updated = await repoAddAssignment(menuId, input);
  if (!updated) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  return updated;
}

/**
 * Remove an assignment by ID. Menu must be in "building" status.
 */
export async function removeAssignment(menuId: string, assignmentId: string) {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status !== 'building') {
    throw new MenuError('Assignments can only be modified on menus in building status', 'CONFLICT');
  }

  const originalLength = menu.assignments.length;
  const updated = await repoRemoveAssignment(menuId, assignmentId);
  if (!updated) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (updated.assignments.length === originalLength) {
    throw new MenuError('Assignment not found', 'NOT_FOUND');
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Survey lifecycle
// ---------------------------------------------------------------------------

/**
 * Open voting on a menu. Transitions building → survey-sent.
 */
export async function sendSurvey(menuId: string): Promise<SurveyResult> {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status !== 'building') {
    throw new MenuError('Survey can only be sent from building status', 'CONFLICT');
  }
  if (menu.assignments.length === 0) {
    throw new MenuError(
      'At least one assignment is required before sending a survey',
      'BAD_REQUEST',
    );
  }

  const votingToken = randomUUID();
  const now = new Date();
  const votingClosesAt = new Date(now.getTime() + VOTING_WINDOW_HOURS * MS_PER_HOUR);

  await updateStatus(menuId, 'survey-sent', {
    votingToken,
    votingOpenedAt: now,
    votingClosesAt,
  });

  log.info('Survey opened', { menuId, votingClosesAt: votingClosesAt.toISOString() });

  const votingUrl = `/vote/${votingToken}`;
  return { votingToken, votingUrl };
}

/**
 * Cancel a voting survey. Transitions survey-sent → building.
 */
export async function cancelSurvey(menuId: string): Promise<void> {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status !== 'survey-sent') {
    throw new MenuError('Survey can only be cancelled from survey-sent status', 'CONFLICT');
  }

  await updateStatus(menuId, 'building', {
    votingToken: null,
    votingOpenedAt: null,
    votingClosesAt: null,
  });
  await clearVotes(menuId);

  log.info('Survey cancelled', { menuId });
}

// ---------------------------------------------------------------------------
// Finalize helpers
// ---------------------------------------------------------------------------

interface AssignmentIds {
  cookbookIds: Types.ObjectId[];
  discoveryIds: Types.ObjectId[];
}

function collectRecipeIds(
  assignments: { source: string; recipeId?: Types.ObjectId; discoveryRecipeId?: Types.ObjectId }[],
): AssignmentIds {
  const cookbookIds: Types.ObjectId[] = [];
  const discoveryIds: Types.ObjectId[] = [];
  for (const a of assignments) {
    if (a.source === 'cookbook' && a.recipeId) {
      cookbookIds.push(a.recipeId);
    } else if (a.source === 'discovery' && a.discoveryRecipeId) {
      discoveryIds.push(a.discoveryRecipeId);
    }
  }
  return { cookbookIds, discoveryIds };
}

interface CollectedIngredients {
  allIngredients: RecipeIngredients[];
  alerts: FinalizeAlert[];
}

function buildIngredientList(
  cookbookRecipes: { slug: string; ingredients: IIngredient[] }[],
  discoveryRecipes: IDiscoveryRecipe[],
): CollectedIngredients {
  const allIngredients: RecipeIngredients[] = [];
  const alerts: FinalizeAlert[] = [];

  for (const recipe of cookbookRecipes) {
    allIngredients.push({ slug: recipe.slug, ingredients: recipe.ingredients });
  }

  for (const recipe of discoveryRecipes) {
    const result = validateDiscoveryIngredients(recipe);
    if (result.parseable) {
      allIngredients.push({
        slug: recipe.externalId,
        ingredients: recipe.ingredients as unknown as IIngredient[],
      });
    } else {
      log.warn('Discovery recipe excluded from shopping list', {
        recipeTitle: recipe.title,
        failedIngredients: result.failedIngredients,
      });
      alerts.push({
        recipeTitle: recipe.title,
        reason: `Unparseable ingredients: ${result.failedIngredients.join(', ')}`,
      });
    }
  }

  return { allIngredients, alerts };
}

function aggregateToShoppingItems(ingredients: RecipeIngredients[]): Partial<IShoppingListItem>[] {
  const aggregated = aggregateIngredients(ingredients);
  return aggregated.map((agg) => {
    const item: Partial<IShoppingListItem> = {
      ingredientName: agg.name,
      category: agg.category,
      isChecked: false,
      isManuallyAdded: false,
      createdAt: new Date(),
    };
    if (agg.displayQuantity) {
      item.quantity = agg.displayQuantity;
    }
    return item;
  });
}

// ---------------------------------------------------------------------------
// Finalize
// ---------------------------------------------------------------------------

export async function finalizeMenu(menuId: string, ownerId: string): Promise<FinalizeResult> {
  return withTrace('menu.finalize', async (span) => {
    await connectDB();
    const menu = await findById(menuId);
    if (!menu) {
      throw new MenuError('Menu not found', 'NOT_FOUND');
    }
    if (menu.status !== 'survey-sent') {
      throw new MenuError('Menu can only be finalized from survey-sent status', 'CONFLICT');
    }

    span.setAttributes({ menuId, assignmentCount: menu.assignments.length });

    const { cookbookIds, discoveryIds } = collectRecipeIds(menu.assignments);

    const [cookbookRecipes, discoveryRecipes] = await Promise.all([
      cookbookIds.length > 0 ? Recipe.find({ _id: { $in: cookbookIds } }) : Promise.resolve([]),
      discoveryIds.length > 0
        ? DiscoveryRecipe.find({ _id: { $in: discoveryIds } })
        : Promise.resolve([]),
    ]);

    const { allIngredients, alerts } = buildIngredientList(cookbookRecipes, discoveryRecipes);
    const items = aggregateToShoppingItems(allIngredients);

    const shoppingList = await ShoppingList.create({
      userId: new Types.ObjectId(ownerId),
      name: `Meal Plan – ${menu.weekLabel}`,
      status: 'active',
      items,
      recipes: cookbookRecipes.map((r) => ({
        recipeId: r._id,
        servingsMultiplier: 1,
        addedAt: new Date(),
      })),
    });

    await updateStatus(menuId, 'locked-in', {
      finalizedAt: new Date(),
      shoppingListId: shoppingList._id,
    });

    log.info('Menu finalized', {
      menuId,
      shoppingListId: shoppingList._id.toString(),
      alertCount: alerts.length,
    });

    return { shoppingListId: shoppingList._id.toString(), alerts };
  });
}

// ---------------------------------------------------------------------------
// Unlock
// ---------------------------------------------------------------------------

/**
 * Unlock a finalized menu: locked-in → building.
 *
 * Deletes the linked shopping list and clears all votes.
 */
export async function unlockMenu(menuId: string): Promise<void> {
  const menu = await findById(menuId);
  if (!menu) {
    throw new MenuError('Menu not found', 'NOT_FOUND');
  }
  if (menu.status !== 'locked-in') {
    throw new MenuError('Only locked-in menus can be unlocked', 'CONFLICT');
  }

  // Delete linked shopping list
  if (menu.shoppingListId) {
    await deleteShoppingListById(menu.shoppingListId.toString());
  }

  // Clear votes and reset status
  await clearVotes(menuId);
  await updateStatus(menuId, 'building', {
    votingToken: null,
    votingOpenedAt: null,
    votingClosesAt: null,
    finalizedAt: null,
    shoppingListId: null,
  });

  log.info('Menu unlocked', { menuId });
}
