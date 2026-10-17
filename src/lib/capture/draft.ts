/**
 * Drafts: Cooklang the capture agent proposes.
 *
 * checkDraft is the only constructor of Draft. It runs parseCooklang, the
 * parser createRecipe and updateRecipe run, and also requires what a cook
 * would recognize as a recipe. Its errors are phrased for the model to fix.
 */

import type { CaptureProblemReason } from '@/db/types';
import { extractMetadataFromContent } from '@/lib/cooklang/metadata';
import { parseCooklang } from '@/lib/cooklang/parser';
import { isRecipeCategory, RECIPE_CATEGORIES, type RecipeCategory } from '@/lib/recipes/categories';

export type { CaptureProblemReason } from '@/db/types';

const MAX_COOKLANG_CHARS = 20_000;

export interface CaptureProblem {
  readonly reason: CaptureProblemReason;
  readonly detail: string;
  /** Slugs the cook can pick from. */
  readonly candidates: readonly string[];
}

export type DraftTarget =
  | { readonly kind: 'new' }
  /** baseCooklang is what the server read for this slug during the run, not what the model claims. */
  | { readonly kind: 'change'; readonly slug: string; readonly baseCooklang: string };

export interface DraftInput {
  readonly cooklang: string;
  readonly category: string;
  readonly warnings: readonly string[];
  readonly target: DraftTarget;
}

/** The persisted form of a Draft. Re-checked before it is committed again. */
export interface StoredDraft extends Omit<DraftInput, 'category'> {
  readonly category: RecipeCategory;
  readonly title: string;
  /** The slug the repository derives from the title. */
  readonly slug: string;
}

const checked: unique symbol = Symbol('Draft');

export interface Draft extends StoredDraft {
  readonly [checked]: true;
}

export type DraftCheck =
  | { readonly ok: true; readonly draft: Draft }
  | { readonly ok: false; readonly errors: readonly string[] };

function rejected(...errors: string[]): DraftCheck {
  return { ok: false, errors };
}

export async function checkDraft(input: DraftInput): Promise<DraftCheck> {
  const { cooklang, category } = input;
  if (!isRecipeCategory(category)) {
    return rejected(`category must be one of: ${RECIPE_CATEGORIES.join(', ')}.`);
  }
  if (cooklang.length > MAX_COOKLANG_CHARS) {
    return rejected(`Keep the Cooklang under ${MAX_COOKLANG_CHARS} characters.`);
  }
  if (!extractMetadataFromContent(cooklang).title?.trim()) {
    return rejected('Start with a ">> title:" line.');
  }

  const parsed = await parseCooklang(cooklang, {
    filePath: `${category}/capture.cook`,
    gitCommitHash: 'capture',
  });
  if (!parsed.success) {
    return rejected(`The Cooklang did not parse: ${parsed.error}`);
  }

  const { recipe } = parsed;
  const errors = [
    ...(recipe.slug ? [] : ['The title needs at least one letter or number.']),
    ...(recipe.steps.length > 0 ? [] : ['Add at least one step.']),
    ...(recipe.ingredients.length > 0
      ? []
      : ['Mark at least one ingredient, like @onion{1} or @flour{2%cups}.']),
  ];
  if (errors.length > 0) {
    return rejected(...errors);
  }

  return {
    ok: true,
    draft: { ...input, category, title: recipe.title, slug: recipe.slug, [checked]: true },
  };
}

export function toDraftInput({ cooklang, category, warnings, target }: StoredDraft): DraftInput {
  return { cooklang, category, warnings, target };
}
