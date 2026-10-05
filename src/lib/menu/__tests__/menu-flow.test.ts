/**
 * Weekly menu flow: adding cookbook recipes from the planner UI (which only
 * knows slugs), the shareable voting link, and vote submission rules. The
 * menu repository, recipe lookup, and session are mocked; no MongoDB
 * connection is made.
 */
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findByVotingToken: vi.fn(),
  repoAddAssignment: vi.fn(),
  repoRemoveAssignment: vi.fn(),
  addVote: vi.fn(),
  getRecipeBySlug: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/db/connection', () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock('@/db/models', () => ({ DiscoveryRecipe: {}, Recipe: {}, ShoppingList: {} }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }));
vi.mock('@/lib/auth/session', () => ({ getSessionFromCookies: mocks.getSession }));
vi.mock('@/lib/recipes/repository', () => ({ getRecipeBySlug: mocks.getRecipeBySlug }));
vi.mock('@/lib/menu/repository', () => ({
  findById: mocks.findById,
  findByVotingToken: mocks.findByVotingToken,
  addAssignment: mocks.repoAddAssignment,
  removeAssignment: mocks.repoRemoveAssignment,
  addVote: mocks.addVote,
  clearVotes: vi.fn(),
  deleteShoppingListById: vi.fn(),
  findByWeek: vi.fn(),
  findOrCreateForWeek: vi.fn(),
  create: vi.fn(),
  deleteMenu: vi.fn(),
  updateStatus: vi.fn(),
}));

import { POST as postAssignment } from '@/app/api/menu/[id]/assignments/route';
import { GET as getVote, POST as postVote } from '@/app/api/vote/[token]/route';
import {
  addAssignment,
  buildVotingUrl,
  isObjectIdString,
  MenuError,
  removeAssignment,
} from '@/lib/menu/service';

const MENU_ID = '507f1f77bcf86cd799439011';
const RECIPE_ID = new Types.ObjectId('507f1f77bcf86cd799439013');
const ASSIGNMENT_ID = new Types.ObjectId('507f1f77bcf86cd799439014');
const TOKEN = '3f1c2f0e-0000-4000-8000-000000000001';
const HOUR_MS = 3_600_000;
const ENV_KEYS = ['NEXT_PUBLIC_APP_URL', 'OAUTH_ISSUER'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function buildingMenu(assignments: unknown[] = []) {
  return { _id: new Types.ObjectId(MENU_ID), status: 'building', assignments };
}

function surveyMenu(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(MENU_ID),
    status: 'survey-sent',
    votingClosesAt: new Date(Date.now() + HOUR_MS),
    assignments: [{ _id: ASSIGNMENT_ID, title: 'Easy French Toast', source: 'cookbook' }],
    ...overrides,
  };
}

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function assignmentRequest(body: Record<string, unknown>): Promise<Response> {
  return postAssignment(jsonRequest(`http://localhost/api/menu/${MENU_ID}/assignments`, body), {
    params: Promise.resolve({ id: MENU_ID }),
  });
}

function voteRequest(body: Record<string, unknown>): Promise<Response> {
  return postVote(jsonRequest(`http://localhost/api/vote/${TOKEN}`, body), {
    params: Promise.resolve({ token: TOKEN }),
  });
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    process.env[key] = '';
  }
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ id: 'u1', email: 'travis@example.com', role: 'owner' });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
});

describe('isObjectIdString', () => {
  it('accepts canonical 24-hex ids and rejects slugs, including 12-character ones', () => {
    expect(isObjectIdString(MENU_ID)).toBe(true);
    expect(isObjectIdString('easy-french-toast')).toBe(false);
    expect(isObjectIdString('french-toast')).toBe(false);
  });
});

describe('buildVotingUrl', () => {
  it('returns an absolute link when NEXT_PUBLIC_APP_URL is set', () => {
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://recipes.example/';
    expect(buildVotingUrl(TOKEN)).toBe(`https://recipes.example/vote/${TOKEN}`);
  });

  it('falls back to OAUTH_ISSUER, then to a relative path', () => {
    process.env['OAUTH_ISSUER'] = 'https://issuer.example';
    expect(buildVotingUrl(TOKEN)).toBe(`https://issuer.example/vote/${TOKEN}`);
    process.env['OAUTH_ISSUER'] = '';
    expect(buildVotingUrl(TOKEN)).toBe(`/vote/${TOKEN}`);
  });
});

describe('addAssignment (service)', () => {
  it('rejects a slug passed as recipeId with BAD_REQUEST instead of crashing', async () => {
    const result = addAssignment(MENU_ID, {
      recipeId: 'easy-french-toast',
      title: 'Easy French Toast',
      source: 'cookbook',
      day: 'mon',
    });
    await expect(result).rejects.toBeInstanceOf(MenuError);
    await expect(result).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mocks.repoAddAssignment).not.toHaveBeenCalled();
  });

  it('rejects a cookbook assignment with no recipe (it would be missing from the shopping list)', async () => {
    await expect(
      addAssignment(MENU_ID, { title: 'Mystery', source: 'cookbook', day: 'mon' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('removeAssignment (service)', () => {
  it('treats a malformed assignment id as not found', async () => {
    await expect(removeAssignment(MENU_ID, 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(mocks.repoRemoveAssignment).not.toHaveBeenCalled();
  });
});

describe('POST /api/menu/[id]/assignments', () => {
  it('resolves a cookbook recipeSlug to the stored recipe id', async () => {
    mocks.getRecipeBySlug.mockResolvedValue({ _id: RECIPE_ID, title: 'Easy French Toast' });
    mocks.findById.mockResolvedValue(buildingMenu());
    const stored = { _id: ASSIGNMENT_ID, recipeId: RECIPE_ID, title: 'Easy French Toast' };
    mocks.repoAddAssignment.mockResolvedValue(buildingMenu([stored]));

    const res = await assignmentRequest({
      title: 'Easy French Toast',
      source: 'cookbook',
      day: 'tue',
      mealSlot: 'dinner',
      recipeSlug: 'easy-french-toast',
    });

    expect(res.status).toBe(200);
    expect(mocks.getRecipeBySlug).toHaveBeenCalledWith('easy-french-toast');
    expect(mocks.repoAddAssignment).toHaveBeenCalledWith(
      MENU_ID,
      expect.objectContaining({ recipeId: RECIPE_ID.toString(), source: 'cookbook', day: 'tue' }),
    );
  });

  it('returns 404 for an unknown recipeSlug', async () => {
    mocks.getRecipeBySlug.mockResolvedValue(null);
    const res = await assignmentRequest({
      title: 'Nope',
      source: 'cookbook',
      day: 'tue',
      recipeSlug: 'does-not-exist',
    });
    expect(res.status).toBe(404);
    expect(mocks.repoAddAssignment).not.toHaveBeenCalled();
  });

  it('returns 400 (not 500) when a slug is sent as recipeId', async () => {
    const res = await assignmentRequest({
      title: 'Easy French Toast',
      source: 'cookbook',
      day: 'tue',
      recipeId: 'easy-french-toast',
    });
    expect(res.status).toBe(400);
    expect(mocks.repoAddAssignment).not.toHaveBeenCalled();
  });
});

describe('/api/vote/[token]', () => {
  it('accepts picks that are assignments on the menu', async () => {
    mocks.findByVotingToken.mockResolvedValue(surveyMenu());
    const pick = ASSIGNMENT_ID.toString();
    const res = await voteRequest({ voterName: 'Ava', voterToken: 'fp-1', picks: [pick, pick] });
    expect(res.status).toBe(200);
    expect(mocks.addVote).toHaveBeenCalledWith(MENU_ID, {
      voterName: 'Ava',
      voterToken: 'fp-1',
      picks: [pick],
    });
  });

  it('rejects picks that are not on the menu with 400', async () => {
    mocks.findByVotingToken.mockResolvedValue(surveyMenu());
    const res = await voteRequest({ voterName: 'Ava', voterToken: 'fp-1', picks: ['bogus'] });
    expect(res.status).toBe(400);
    expect(mocks.addVote).not.toHaveBeenCalled();
  });

  it('closes voting once the menu is locked in, even inside the voting window', async () => {
    mocks.findByVotingToken.mockResolvedValue(surveyMenu({ status: 'locked-in' }));
    const pick = ASSIGNMENT_ID.toString();
    const res = await voteRequest({ voterName: 'Ava', voterToken: 'fp-1', picks: [pick] });
    expect(res.status).toBe(410);
    expect(mocks.addVote).not.toHaveBeenCalled();

    const get = await getVote(new Request(`http://localhost/api/vote/${TOKEN}`), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(((await get.json()) as { isOpen: boolean }).isOpen).toBe(false);
  });
});
