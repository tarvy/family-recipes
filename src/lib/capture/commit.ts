/**
 * Commit a checked Draft through the recipe repository.
 *
 * The only capture code that calls createRecipe or updateRecipe. Safe to
 * call any number of times for the same draft: a recipe whose rawCooklang
 * already equals the draft is the earlier write, so it is reported as saved.
 * An add never overwrites. A change writes only if the recipe still equals
 * the base Cooklang the agent read.
 */

import type { CaptureChange } from '@/db/types';
import { isDuplicateKeyError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  createRecipe,
  getRawCooklangContent,
  type RecipeWriteError,
  type RecipeWriteResult,
  updateRecipe,
} from '@/lib/recipes/repository';
import { withTrace } from '@/lib/telemetry';
import type { CaptureProblem, Draft, StoredDraft } from './draft';

export interface CommittedDraft {
  readonly slug: string;
  readonly change: CaptureChange;
}

export type CommitOutcome =
  | ({ readonly ok: true } & CommittedDraft)
  | { readonly ok: false; readonly problem: CaptureProblem };

function needsAttention(
  reason: CaptureProblem['reason'],
  detail: string,
  candidates: readonly string[],
): CommitOutcome {
  return { ok: false, problem: { reason, detail, candidates } };
}

function changeFor(draft: StoredDraft): CaptureChange {
  return draft.target.kind === 'new' ? 'created' : 'updated';
}

/** The recipe this draft already produced, if a commit of it landed. Reads only. */
export async function findCommittedDraft(draft: StoredDraft): Promise<CommittedDraft | null> {
  const current = await getRawCooklangContent(draft.slug);
  return current?.content === draft.cooklang
    ? { slug: draft.slug, change: changeFor(draft) }
    : null;
}

function fromWriteError(error: RecipeWriteError, draft: Draft): CommitOutcome {
  switch (error.code) {
    case 'DUPLICATE_SLUG':
      return needsAttention('duplicate', error.error, [draft.slug]);
    case 'NOT_FOUND':
      return needsAttention('target_not_found', error.error, []);
    case 'PARSE_ERROR':
    case 'VALIDATION_ERROR':
    case undefined:
      logger.capture.error('Repository rejected a checked draft', undefined, {
        slug: draft.slug,
        code: error.code ?? 'unknown',
        error: error.error,
      });
      throw new Error(`Repository rejected a checked draft: ${error.error}`);
    default: {
      const unreachable: never = error.code;
      return unreachable;
    }
  }
}

function toOutcome(result: RecipeWriteResult, draft: Draft): CommitOutcome {
  return result.success
    ? { ok: true, slug: result.slug, change: changeFor(draft) }
    : fromWriteError(result, draft);
}

async function commitNew(draft: Draft): Promise<CommitOutcome> {
  try {
    return toOutcome(await createRecipe(draft.cooklang, draft.category, 'capture'), draft);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    return needsAttention('duplicate', `A recipe with slug "${draft.slug}" already exists.`, [
      draft.slug,
    ]);
  }
}

async function commitChange(
  draft: Draft,
  slug: string,
  baseCooklang: string,
): Promise<CommitOutcome> {
  const current = await getRawCooklangContent(slug);
  if (!current) {
    return needsAttention('target_not_found', `No recipe has slug "${slug}".`, []);
  }
  if (current.content !== baseCooklang) {
    return needsAttention('conflict', `"${slug}" changed after the capture read it.`, [slug]);
  }
  return toOutcome(await updateRecipe(slug, draft.cooklang, draft.category, 'capture'), draft);
}

export async function commitDraft(draft: Draft): Promise<CommitOutcome> {
  return withTrace('capture.commit', async (span) => {
    span.setAttributes({ slug: draft.slug, target: draft.target.kind });

    const committed = await findCommittedDraft(draft);
    if (committed) {
      span.setAttribute('already_committed', true);
      return { ok: true, ...committed };
    }

    const { target } = draft;
    switch (target.kind) {
      case 'new':
        return commitNew(draft);
      case 'change':
        return commitChange(draft, target.slug, target.baseCooklang);
      default: {
        const unreachable: never = target;
        return unreachable;
      }
    }
  });
}
