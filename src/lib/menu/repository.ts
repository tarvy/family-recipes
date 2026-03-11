/** Data access layer for WeeklyMenu documents. */

import { Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { ShoppingList, WeeklyMenu } from '@/db/models';
import type {
  AssignmentSource,
  DayOfWeek,
  IWeeklyMenuDocument,
  MealSlot,
  WeeklyMenuStatus,
} from '@/db/types';
import { createLogger } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

const log = createLogger('menu');

/** Input for adding a recipe assignment to a menu. */
export interface AddAssignmentInput {
  recipeId?: string;
  discoveryRecipeId?: string;
  title: string;
  thumbnailUrl?: string;
  source: AssignmentSource;
  day: DayOfWeek;
  mealSlot?: MealSlot;
}

/** Input for recording a vote on a menu. */
export interface VoteInput {
  voterName: string;
  voterToken: string;
  picks: string[];
}

export async function findByWeek(
  ownerId: string,
  weekLabel: string,
): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.findByWeek', async () => {
    await connectDB();
    log.info('Finding menu by week', { ownerId, weekLabel });
    return WeeklyMenu.findOne({
      ownerId: new Types.ObjectId(ownerId),
      weekLabel,
    });
  });
}

export async function findById(id: string): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.findById', async () => {
    await connectDB();
    return WeeklyMenu.findById(id);
  });
}

export async function findByVotingToken(token: string): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.findByVotingToken', async () => {
    await connectDB();
    return WeeklyMenu.findOne({ votingToken: token });
  });
}

export async function create(
  ownerId: string,
  weekLabel: string,
  weekStartDate: Date,
): Promise<IWeeklyMenuDocument> {
  return withTrace('menu.create', async () => {
    await connectDB();
    log.info('Creating menu', { ownerId, weekLabel });
    return WeeklyMenu.create({
      ownerId: new Types.ObjectId(ownerId),
      weekLabel,
      weekStartDate,
      status: 'building' as const,
      assignments: [],
      votes: [],
    });
  });
}

export async function findOrCreateForWeek(
  ownerId: string,
  weekLabel: string,
  weekStartDate: Date,
): Promise<IWeeklyMenuDocument> {
  return withTrace('menu.findOrCreate', async () => {
    await connectDB();
    const existing = await WeeklyMenu.findOne({
      ownerId: new Types.ObjectId(ownerId),
      weekLabel,
    });
    if (existing) {
      return existing;
    }
    log.info('Auto-creating menu for week', { ownerId, weekLabel });
    return WeeklyMenu.create({
      ownerId: new Types.ObjectId(ownerId),
      weekLabel,
      weekStartDate,
      status: 'building' as const,
      assignments: [],
      votes: [],
    });
  });
}

export async function addAssignment(
  menuId: string,
  input: AddAssignmentInput,
): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.addAssignment', async () => {
    await connectDB();
    log.info('Adding assignment', {
      menuId,
      source: input.source,
      day: input.day,
    });

    const subdoc: Record<string, unknown> = {
      title: input.title,
      source: input.source,
      day: input.day,
      mealSlot: input.mealSlot ?? 'dinner',
      addedAt: new Date(),
    };

    if (input.recipeId) {
      subdoc['recipeId'] = new Types.ObjectId(input.recipeId);
    }
    if (input.discoveryRecipeId) {
      subdoc['discoveryRecipeId'] = new Types.ObjectId(input.discoveryRecipeId);
    }
    if (input.thumbnailUrl) {
      subdoc['thumbnailUrl'] = input.thumbnailUrl;
    }

    return WeeklyMenu.findByIdAndUpdate(menuId, { $push: { assignments: subdoc } }, { new: true });
  });
}

export async function removeAssignment(
  menuId: string,
  assignmentId: string,
): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.removeAssignment', async () => {
    await connectDB();
    log.info('Removing assignment', { menuId, assignmentId });
    return WeeklyMenu.findByIdAndUpdate(
      menuId,
      {
        $pull: {
          assignments: { _id: new Types.ObjectId(assignmentId) },
        },
      },
      { new: true },
    );
  });
}

export async function updateStatus(
  menuId: string,
  status: WeeklyMenuStatus,
  fields?: Record<string, unknown>,
): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.updateStatus', async () => {
    await connectDB();
    log.info('Updating menu status', { menuId, status });
    return WeeklyMenu.findByIdAndUpdate(menuId, { $set: { status, ...fields } }, { new: true });
  });
}

export async function addVote(
  menuId: string,
  vote: VoteInput,
): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.addVote', async () => {
    await connectDB();
    log.info('Recording vote', { menuId, voterName: vote.voterName });

    await WeeklyMenu.findByIdAndUpdate(menuId, {
      $pull: { votes: { voterToken: vote.voterToken } },
    });

    return WeeklyMenu.findByIdAndUpdate(
      menuId,
      {
        $push: {
          votes: {
            voterName: vote.voterName,
            voterToken: vote.voterToken,
            picks: vote.picks.map((id) => new Types.ObjectId(id)),
            votedAt: new Date(),
          },
        },
      },
      { new: true },
    );
  });
}

export async function clearVotes(menuId: string): Promise<IWeeklyMenuDocument | null> {
  return withTrace('menu.clearVotes', async () => {
    await connectDB();
    log.info('Clearing votes', { menuId });
    return WeeklyMenu.findByIdAndUpdate(menuId, { $set: { votes: [] } }, { new: true });
  });
}

export async function deleteMenu(menuId: string): Promise<boolean> {
  return withTrace('menu.delete', async () => {
    await connectDB();
    log.info('Deleting menu', { menuId });
    const result = await WeeklyMenu.findByIdAndDelete(menuId);
    return result !== null;
  });
}

export async function deleteShoppingListById(shoppingListId: string): Promise<void> {
  return withTrace('menu.deleteShoppingList', async () => {
    await connectDB();
    log.info('Deleting linked shopping list', { shoppingListId });
    await ShoppingList.findByIdAndDelete(shoppingListId);
  });
}
