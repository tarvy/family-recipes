/**
 * Capture end to end through the routes, with a scripted model and an
 * in-memory Mongo: the same submit is one capture, a rejected draft writes
 * no recipe, and an interrupted capture recovers from what it stored.
 */

import type { MockLanguageModelV4 } from 'ai/test';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/captures/[id]/route';
import { POST } from '@/app/api/captures/route';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { Capture } from '@/db/models/capture.model';
import { Recipe } from '@/db/models/recipe.model';
import { User } from '@/db/models/user.model';
import type { ICapture, ICaptureDraft } from '@/db/types';
import { mintApiKey } from '@/lib/auth/api-key';
import {
  HTTP_ACCEPTED,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
  HTTP_UNSUPPORTED_MEDIA_TYPE,
} from '@/lib/constants/http-status';
import type * as Repository from '@/lib/recipes/repository';
import { createRecipe, getRawCooklangContent, updateRecipe } from '@/lib/recipes/repository';
import { MAX_AGENT_STEPS } from '../agent';
import { LEASE_MS, MAX_ATTEMPTS } from '../store';
import type { CaptureSubmission } from '../submission';
import {
  CHILI,
  CHILI_EDITED,
  CHILI_SLUG,
  captureForm,
  submissionFor,
  UNTITLED_CHILI,
  voiceNote,
} from './fixtures';
import { repeat, type ScriptedToolCall, scriptedModel, toolCall } from './scripted-model';

const scripted = vi.hoisted(() => ({ model: null as MockLanguageModelV4 | null }));
const background = vi.hoisted(() => ({ tasks: [] as Promise<unknown>[] }));

vi.mock('@ai-sdk/google', () => ({
  google: () => {
    if (!scripted.model) {
      throw new Error('This test has no scripted model');
    }
    return scripted.model;
  },
}));

vi.mock('next/server', () => ({
  after: (task: Promise<unknown>) => {
    background.tasks.push(task);
  },
}));

vi.mock('@/lib/recipes/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof Repository>();
  return {
    ...actual,
    createRecipe: vi.fn(actual.createRecipe),
    updateRecipe: vi.fn(actual.updateRecipe),
  };
});

setupMemoryMongo();

const ORIGIN = 'https://recipes.example';
const EMAIL = 'sam@family.example';

const DRAFTED_CHILI: ICaptureDraft = {
  cooklang: CHILI,
  category: 'soups',
  title: 'Weeknight Chili',
  slug: CHILI_SLUG,
  warnings: [],
  target: { kind: 'new', slug: null, baseCooklang: null },
};

const submitChili = toolCall('submit_new_recipe', {
  cooklang: CHILI,
  category: 'soups',
  warnings: [],
});

let token = '';

beforeEach(async () => {
  scripted.model = null;
  background.tasks.length = 0;
  await User.create({ email: EMAIL, role: 'family' });
  ({ token } = await mintApiKey({ email: EMAIL, label: 'Test phone', scopes: ['captures:write'] }));
  vi.mocked(createRecipe).mockClear();
  vi.mocked(updateRecipe).mockClear();
});

function useModel(script: readonly ScriptedToolCall[]): MockLanguageModelV4 {
  scripted.model = scriptedModel(script);
  return scripted.model;
}

async function post(form: FormData, authorization = `Bearer ${token}`): Promise<Response> {
  const response = await POST(
    new Request(`${ORIGIN}/api/captures`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: form,
    }),
  );
  await Promise.all(background.tasks);
  return response;
}

async function get(id: string): Promise<Response> {
  return GET(
    new Request(`${ORIGIN}/api/captures/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
    { params: Promise.resolve({ id }) },
  );
}

async function seedChili(content: string): Promise<void> {
  await createRecipe(content, 'soups', 'capture');
  vi.mocked(createRecipe).mockClear();
}

/** A capture row left behind by an earlier invocation of the same submission. */
async function leftBehind(
  submission: CaptureSubmission,
  state: Partial<ICapture>,
): Promise<string> {
  const row = await Capture.create({
    key: submission.key,
    submittedBy: { userId: new Types.ObjectId(), keyId: 'otherdevice00000' },
    intent: { kind: 'add', slug: null },
    media: submission.media.map(({ kind, mediaType, bytes, sha256 }) => ({
      kind,
      mediaType,
      bytes: bytes.byteLength,
      sha256,
    })),
    status: 'pending',
    attempt: 1,
    leaseExpiresAt: new Date(Date.now() - LEASE_MS),
    ...state,
  });
  return row.id;
}

describe('POST /api/captures', () => {
  it('answers the same submit with the same capture and drafts it once', async () => {
    const model = useModel([submitChili]);

    const first = await post(captureForm());
    const second = await post(captureForm());
    const body = await first.json();

    expect(first.status).toBe(HTTP_OK);
    expect(body).toMatchObject({
      status: 'saved',
      change: 'created',
      recipe: { slug: CHILI_SLUG, title: 'Weeknight Chili', category: 'soups' },
      message: 'Saved "Weeknight Chili" to soups.',
      recipeUrl: `${ORIGIN}/recipes/${CHILI_SLUG}`,
      statusUrl: `${ORIGIN}/api/captures/${body.id}`,
    });
    expect(await second.json()).toEqual(body);
    expect(await Capture.countDocuments()).toBe(1);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(createRecipe).toHaveBeenCalledTimes(1);
    expect(await Recipe.countDocuments()).toBe(1);
  });

  it('writes no recipe when checkDraft rejects every draft', async () => {
    useModel(
      repeat(
        toolCall('submit_new_recipe', {
          cooklang: UNTITLED_CHILI,
          category: 'soups',
          warnings: [],
        }),
        MAX_AGENT_STEPS,
      ),
    );

    const response = await post(captureForm());

    expect(await response.json()).toMatchObject({ status: 'needs_attention', reason: 'gave_up' });
    expect(createRecipe).not.toHaveBeenCalled();
    expect(updateRecipe).not.toHaveBeenCalled();
    expect(await Recipe.countDocuments()).toBe(0);
  });

  it('changes a pinned recipe from a voice note', async () => {
    await seedChili(CHILI);
    useModel([
      toolCall('submit_change', {
        slug: CHILI_SLUG,
        cooklang: CHILI_EDITED,
        category: 'soups',
        warnings: [],
      }),
    ]);

    const response = await post(
      captureForm({ media: [voiceNote()], intent: 'change', slug: CHILI_SLUG }),
    );

    expect(await response.json()).toMatchObject({
      status: 'saved',
      change: 'updated',
      message: 'Updated "Weeknight Chili".',
    });
    expect((await getRawCooklangContent(CHILI_SLUG))?.content).toBe(CHILI_EDITED);
  });

  it('marks a drafted capture saved when its recipe already landed, without the model', async () => {
    const submission = await submissionFor(captureForm());
    await seedChili(CHILI);
    const id = await leftBehind(submission, { status: 'drafted', draft: DRAFTED_CHILI });
    const model = useModel([]);

    const response = await post(captureForm());

    expect(await response.json()).toMatchObject({ id, status: 'saved', change: 'created' });
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(createRecipe).not.toHaveBeenCalled();
    expect(await Capture.findById(id).lean()).toMatchObject({ status: 'saved', attempt: 1 });
  });

  it('resumes a drafted capture at commit without calling the model', async () => {
    const submission = await submissionFor(captureForm());
    const id = await leftBehind(submission, { status: 'drafted', draft: DRAFTED_CHILI });
    const model = useModel([]);

    const response = await post(captureForm());

    expect(await response.json()).toMatchObject({ id, status: 'saved', change: 'created' });
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(createRecipe).toHaveBeenCalledTimes(1);
    expect(await Capture.findById(id).lean()).toMatchObject({ status: 'saved', attempt: 2 });
  });

  it('drafts again when an interrupted capture had no draft', async () => {
    const id = await leftBehind(await submissionFor(captureForm()), { status: 'pending' });
    const model = useModel([submitChili]);

    const response = await post(captureForm());

    expect(await response.json()).toMatchObject({ id, status: 'saved' });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(await Capture.findById(id).lean()).toMatchObject({ attempt: 2 });
  });

  it('reports a capture that is still running as working', async () => {
    const id = await leftBehind(await submissionFor(captureForm()), {
      status: 'pending',
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
    });
    const model = useModel([]);

    const response = await post(captureForm());

    expect(response.status).toBe(HTTP_ACCEPTED);
    expect(response.headers.get('Location')).toBe(`${ORIGIN}/api/captures/${id}`);
    expect(await response.json()).toMatchObject({ id, status: 'working' });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('stops retrying once the last attempt failed', async () => {
    await leftBehind(await submissionFor(captureForm()), {
      status: 'failed',
      attempt: MAX_ATTEMPTS,
      leaseExpiresAt: null,
      errorMessage: 'provider timeout',
    });
    const model = useModel([]);

    const response = await post(captureForm());

    expect(await response.json()).toMatchObject({ status: 'failed', retryable: false });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('rejects a missing key, missing media, and an unsupported file type', async () => {
    const unauthenticated = await post(captureForm(), '');
    const empty = await post(new FormData());
    const text = await post(
      captureForm({ media: [new File(['notes'], 'notes.txt', { type: 'text/plain' })] }),
    );

    expect(unauthenticated.status).toBe(HTTP_UNAUTHORIZED);
    expect(unauthenticated.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(empty.status).toBe(HTTP_BAD_REQUEST);
    expect(text.status).toBe(HTTP_UNSUPPORTED_MEDIA_TYPE);
    expect(await Capture.countDocuments()).toBe(0);
  });
});

describe('GET /api/captures/[id]', () => {
  it('marks a drafted capture saved when its recipe already landed, without the model', async () => {
    await seedChili(CHILI);
    const id = await leftBehind(await submissionFor(captureForm()), {
      status: 'drafted',
      draft: DRAFTED_CHILI,
    });
    const model = useModel([]);

    const response = await get(id);

    expect(await response.json()).toMatchObject({ id, status: 'saved', change: 'created' });
    expect(model.doGenerateCalls).toHaveLength(0);
    expect(await Capture.findById(id).lean()).toMatchObject({ status: 'saved', attempt: 1 });
  });

  it('reports an interrupted capture without starting a new attempt', async () => {
    const id = await leftBehind(await submissionFor(captureForm()), { status: 'pending' });

    const response = await get(id);

    expect(await response.json()).toMatchObject({ id, status: 'failed', retryable: true });
    expect(await Capture.findById(id).lean()).toMatchObject({ status: 'pending', attempt: 1 });
  });

  it('returns 404 for an unknown capture', async () => {
    const response = await get(new Types.ObjectId().toString());

    expect(response.status).toBe(HTTP_NOT_FOUND);
  });
});
