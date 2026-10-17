/**
 * The capture agent against a scripted model: it proposes drafts, fixes
 * rejected Cooklang inside its step budget, and can only change a recipe
 * it read during the run.
 */

import { describe, expect, it } from 'vitest';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { createRecipe } from '@/lib/recipes/repository';
import { draftRecipe, MAX_AGENT_STEPS } from '../agent';
import {
  CHILI,
  CHILI_EDITED,
  CHILI_SLUG,
  captureForm,
  submissionFor,
  UNTITLED_CHILI,
  voiceNote,
} from './fixtures';
import { repeat, scriptedModel, toolCall } from './scripted-model';

setupMemoryMongo();

const submitChili = toolCall('submit_new_recipe', {
  cooklang: CHILI,
  category: 'soups',
  warnings: ['The simmer time was smudged; read it as 20 minutes.'],
});

const changeChili = toolCall('submit_change', {
  slug: CHILI_SLUG,
  cooklang: CHILI_EDITED,
  category: 'soups',
  warnings: [],
});

describe('draftRecipe', () => {
  it('drafts a new recipe from a photo it was shown', async () => {
    const model = scriptedModel([submitChili]);

    const outcome = await draftRecipe(await submissionFor(captureForm()), model);

    expect(outcome).toMatchObject({
      ok: true,
      draft: { slug: CHILI_SLUG, target: { kind: 'new' }, warnings: [expect.any(String)] },
    });
    expect(model.doGenerateCalls[0]?.prompt).toContainEqual(
      expect.objectContaining({
        role: 'user',
        content: expect.arrayContaining([
          expect.objectContaining({ type: 'file', mediaType: 'image/jpeg' }),
        ]),
      }),
    );
  });

  it('fixes its own Cooklang when a submit is rejected', async () => {
    const model = scriptedModel([
      toolCall('submit_new_recipe', { cooklang: UNTITLED_CHILI, category: 'soups', warnings: [] }),
      submitChili,
    ]);

    const outcome = await draftRecipe(await submissionFor(captureForm()), model);

    expect(outcome).toMatchObject({ ok: true, draft: { slug: CHILI_SLUG } });
    expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain('title:');
  });

  it('drafts a change against the Cooklang the server read', async () => {
    await createRecipe(CHILI, 'soups', 'api');
    const model = scriptedModel([
      toolCall('find_recipes', { query: 'chili' }),
      toolCall('read_recipe', { slug: CHILI_SLUG }),
      changeChili,
    ]);

    const outcome = await draftRecipe(
      await submissionFor(captureForm({ media: [voiceNote()], intent: 'change' })),
      model,
    );

    expect(outcome).toMatchObject({
      ok: true,
      draft: {
        cooklang: CHILI_EDITED,
        target: { kind: 'change', slug: CHILI_SLUG, baseCooklang: CHILI },
      },
    });
  });

  it('refuses a change to a recipe the run never read and gives up at the step cap', async () => {
    await createRecipe(CHILI, 'soups', 'api');
    const model = scriptedModel(repeat(changeChili, MAX_AGENT_STEPS));

    const outcome = await draftRecipe(
      await submissionFor(captureForm({ media: [voiceNote()], intent: 'change' })),
      model,
    );

    expect(outcome).toMatchObject({ ok: false, problem: { reason: 'gave_up' } });
    expect(model.doGenerateCalls).toHaveLength(MAX_AGENT_STEPS);
  });

  it('stops before calling the model when a pinned recipe does not exist', async () => {
    const model = scriptedModel([]);

    const outcome = await draftRecipe(
      await submissionFor(captureForm({ intent: 'change', slug: 'no-such-recipe' })),
      model,
    );

    expect(outcome).toMatchObject({ ok: false, problem: { reason: 'target_not_found' } });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('reports a duplicate instead of drafting over an existing recipe', async () => {
    await createRecipe(CHILI, 'soups', 'api');
    const model = scriptedModel([
      submitChili,
      toolCall('cannot_complete', {
        reason: 'duplicate',
        detail: 'Weeknight Chili is already in the cookbook.',
        candidates: [CHILI_SLUG],
      }),
    ]);

    const outcome = await draftRecipe(await submissionFor(captureForm()), model);

    expect(outcome).toEqual({
      ok: false,
      problem: {
        reason: 'duplicate',
        detail: 'Weeknight Chili is already in the cookbook.',
        candidates: [CHILI_SLUG],
      },
    });
  });
});
