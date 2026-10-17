/**
 * updateRecipe replaces a recipe's Cooklang and leaves the household's data
 * alone: photos, rating, cook log, usage, and createdAt.
 */

import { expect, it } from 'vitest';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { Recipe } from '@/db/models/recipe.model';
import {
  addCookLogEntry,
  createRecipe,
  getRecipeBySlug,
  rateRecipe,
  recordRecipeUse,
  updateRecipe,
} from '@/lib/recipes/repository';

setupMemoryMongo();

const SLUG = 'weeknight-chili';
const PHOTO = 'https://blob.example/chili.jpg';
const RATING = 5;
const ORIGINAL = `>> title: Weeknight Chili
>> servings: 4

Brown @ground beef{1%lb} in a #pot{}.
`;
const EDITED = `>> title: Weeknight Chili
>> servings: 6

Brown @ground beef{2%lb} in a #pot{}. Stir in @kidney beans{2%cans}.
`;

it('keeps photos, rating, cook log, usage, and createdAt when the Cooklang changes', async () => {
  expect((await createRecipe(ORIGINAL, 'soups', 'api')).success).toBe(true);
  await Recipe.updateOne(
    { slug: SLUG },
    { $push: { photoUrls: PHOTO }, $set: { primaryPhotoUrl: PHOTO } },
  );
  await rateRecipe(SLUG, RATING);
  await addCookLogEntry(SLUG, 'Doubled the cumin');
  await recordRecipeUse(SLUG);
  const before = await getRecipeBySlug(SLUG);

  const result = await updateRecipe(SLUG, EDITED, 'soups', 'capture');

  expect(result.success).toBe(true);
  const after = await getRecipeBySlug(SLUG);
  expect(after?.rawCooklang).toBe(EDITED);
  expect(after?.servings).toBe(6);
  expect(after?.photoUrls).toEqual([PHOTO]);
  expect(after?.primaryPhotoUrl).toBe(PHOTO);
  expect(after?.rating).toBe(RATING);
  expect(after?.cookLog?.map((entry) => entry.note)).toEqual(['Doubled the cumin']);
  expect(after?.useCount).toBe(1);
  expect(after?.lastUsedAt).toEqual(before?.lastUsedAt);
  expect(after?.createdAt).toEqual(before?.createdAt);
});
