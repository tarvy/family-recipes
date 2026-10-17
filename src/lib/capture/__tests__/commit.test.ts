/**
 * commitDraft is safe to repeat, never overwrites on add, and only changes
 * a recipe that still matches the Cooklang the agent read.
 */

import { describe, expect, it } from 'vitest';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { Recipe } from '@/db/models/recipe.model';
import {
  createRecipe,
  deleteRecipe,
  getRawCooklangContent,
  updateRecipe,
} from '@/lib/recipes/repository';
import { commitDraft } from '../commit';
import type { Draft } from '../draft';
import {
  CHILI,
  CHILI_EDITED,
  CHILI_SIMMERED,
  CHILI_SLUG,
  checked,
  newChiliDraft,
} from './fixtures';

setupMemoryMongo();

function chiliChange(baseCooklang: string): Promise<Draft> {
  return checked({
    cooklang: CHILI_EDITED,
    category: 'soups',
    warnings: [],
    target: { kind: 'change', slug: CHILI_SLUG, baseCooklang },
  });
}

async function storedChili(): Promise<string | undefined> {
  return (await getRawCooklangContent(CHILI_SLUG))?.content;
}

describe('commitDraft', () => {
  it('creates the recipe once when the same draft is committed twice', async () => {
    const draft = await newChiliDraft();

    expect(await commitDraft(draft)).toEqual({ ok: true, slug: CHILI_SLUG, change: 'created' });
    expect(await commitDraft(draft)).toEqual({ ok: true, slug: CHILI_SLUG, change: 'created' });
    expect(await Recipe.countDocuments({ slug: CHILI_SLUG })).toBe(1);
  });

  it('reports a duplicate instead of overwriting a different recipe with the same title', async () => {
    await createRecipe(CHILI_EDITED, 'soups', 'api');

    const outcome = await commitDraft(await newChiliDraft());

    expect(outcome).toMatchObject({
      ok: false,
      problem: { reason: 'duplicate', candidates: [CHILI_SLUG] },
    });
    expect(await storedChili()).toBe(CHILI_EDITED);
  });

  it('applies a change when the recipe still matches what the agent read', async () => {
    await createRecipe(CHILI, 'soups', 'api');

    const outcome = await commitDraft(await chiliChange(CHILI));

    expect(outcome).toEqual({ ok: true, slug: CHILI_SLUG, change: 'updated' });
    expect(await storedChili()).toBe(CHILI_EDITED);
  });

  it('refuses a change when the recipe was edited after the agent read it', async () => {
    await createRecipe(CHILI, 'soups', 'api');
    await updateRecipe(CHILI_SLUG, CHILI_SIMMERED, 'soups', 'api');

    const outcome = await commitDraft(await chiliChange(CHILI));

    expect(outcome).toMatchObject({ ok: false, problem: { reason: 'conflict' } });
    expect(await storedChili()).toBe(CHILI_SIMMERED);
  });

  it('reports target_not_found when the recipe was deleted', async () => {
    await createRecipe(CHILI, 'soups', 'api');
    await deleteRecipe(CHILI_SLUG, 'api');

    const outcome = await commitDraft(await chiliChange(CHILI));

    expect(outcome).toMatchObject({ ok: false, problem: { reason: 'target_not_found' } });
    expect(await Recipe.countDocuments()).toBe(0);
  });
});
