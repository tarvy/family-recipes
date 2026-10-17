/**
 * checkDraft accepts what the repository's parser accepts and a cook would
 * call a recipe, and phrases every rejection for the model to fix.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDraft, type DraftInput } from '../draft';
import { CHILI, CHILI_SLUG, UNTITLED_CHILI } from './fixtures';

function input(cooklang: string, category = 'soups'): DraftInput {
  return { cooklang, category, warnings: [], target: { kind: 'new' } };
}

describe('checkDraft', () => {
  it('accepts a real cookbook recipe and derives the slug the repository will store', async () => {
    const cooklang = await readFile(
      path.join(process.cwd(), 'recipes/soups/moms-white-chicken-chili.cook'),
      'utf8',
    );

    const result = await checkDraft(input(cooklang));

    expect(result).toMatchObject({
      ok: true,
      draft: { slug: 'moms-white-chicken-chili', category: 'soups' },
    });
  });

  it('accepts a minimal recipe with its title and slug', async () => {
    expect(await checkDraft(input(CHILI))).toMatchObject({
      ok: true,
      draft: { title: 'Weeknight Chili', slug: CHILI_SLUG },
    });
  });

  it.each([
    ['an unknown category', input(CHILI, 'mains'), 'category must be one of'],
    ['a missing title', input(UNTITLED_CHILI), '>> title:'],
    ['no steps', input('>> title: Weeknight Chili\n'), 'at least one step'],
    [
      'no ingredients',
      input('>> title: Weeknight Chili\n\nSimmer until thick.\n'),
      'at least one ingredient',
    ],
  ])('rejects %s', async (_case, draftInput, message) => {
    const result = await checkDraft(draftInput);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.join(' ')).toContain(message);
  });
});
