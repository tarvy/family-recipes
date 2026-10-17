/**
 * Capture: turn photos or voice notes into a new or changed recipe.
 *
 * The public surface of the capture module. runCapture is the whole
 * lifecycle of one claimed attempt: draft with the agent, save the draft,
 * commit it through the recipe repository, record the outcome. toView is
 * the only place stored state becomes what the cook sees.
 *
 * Usage:
 *   const form = await parseCaptureForm(await request.formData());
 *   if (form.ok) {
 *     const view = await submitCapture(principal, form.submission);
 *   }
 */

import { after } from 'next/server';
import type { CaptureChange } from '@/db/types';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { RecipeCategory } from '@/lib/recipes/categories';
import { withTrace } from '@/lib/telemetry';
import { draftRecipe } from './agent';
import { commitDraft, findCommittedDraft } from './commit';
import {
  type CaptureProblem,
  type CaptureProblemReason,
  checkDraft,
  type Draft,
  toDraftInput,
} from './draft';
import {
  type CaptureRecord,
  type CaptureResult,
  type Claim,
  finishCapture,
  MAX_ATTEMPTS,
  markSaved,
  openCapture,
  type RunningRecord,
  readCapture,
  reclaimCapture,
  saveDraft,
} from './store';
import type { CaptureSubmission, CaptureSubmitter } from './submission';

export type { CaptureProblemReason } from './draft';
export type {
  CaptureInputErrorCode,
  CaptureIntent,
  CaptureSubmission,
  CaptureSubmitter,
  ParsedCaptureForm,
} from './submission';
export { parseCaptureForm } from './submission';

/** How long the POST waits for the run before answering 202. */
export const CAPTURE_INLINE_WAIT_MS = 25_000;

interface CaptureViewBase {
  readonly id: string;
  /** One sentence for a phone notification. */
  readonly message: string;
}

export type CaptureView =
  | (CaptureViewBase & { readonly status: 'working' })
  | (CaptureViewBase & {
      readonly status: 'saved';
      readonly change: CaptureChange;
      readonly recipe: {
        readonly slug: string;
        readonly title: string;
        readonly category: RecipeCategory;
      };
      readonly warnings: readonly string[];
    })
  | (CaptureViewBase & {
      readonly status: 'needs_attention';
      readonly reason: CaptureProblemReason;
      readonly detail: string;
      readonly candidates: readonly string[];
    })
  | (CaptureViewBase & { readonly status: 'failed'; readonly retryable: boolean });

type DraftStep =
  | { readonly ok: true; readonly draft: Draft }
  | { readonly ok: false; readonly result: CaptureResult };

function problemMessage({ reason, candidates }: CaptureProblem): string {
  switch (reason) {
    case 'not_a_recipe':
      return "That doesn't look like a recipe.";
    case 'unreadable':
      return "Couldn't make it out. Try a clearer photo or recording.";
    case 'duplicate':
      return `You already have "${candidates[0] ?? 'that recipe'}". Use Change Recipe to replace it.`;
    case 'ambiguous_target':
      return `Several recipes match: ${candidates.join(', ')}. Send it again with a slug.`;
    case 'target_not_found':
      return "Couldn't find the recipe to change.";
    case 'target_has_no_cooklang':
      return "That recipe can't be changed from a capture yet.";
    case 'conflict':
      return 'That recipe changed while this ran, so nothing was overwritten.';
    case 'gave_up':
      return "Couldn't turn that into a recipe. Try a clearer photo or recording.";
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}

function toView(record: CaptureRecord, now: Date): CaptureView {
  const { id } = record;
  const retryable = record.attempt < MAX_ATTEMPTS;
  switch (record.status) {
    case 'pending':
    case 'drafted':
      if (record.leaseExpiresAt > now) {
        return { id, status: 'working', message: 'Still reading it. Check back in a minute.' };
      }
      return {
        id,
        status: 'failed',
        retryable,
        message: retryable
          ? 'That capture was interrupted. Send the same files again.'
          : 'That capture was interrupted too many times.',
      };
    case 'saved': {
      const { title, category, warnings } = record.draft;
      return {
        id,
        status: 'saved',
        change: record.change,
        recipe: { slug: record.slug, title, category },
        warnings,
        message:
          record.change === 'created' ? `Saved "${title}" to ${category}.` : `Updated "${title}".`,
      };
    }
    case 'needs_attention': {
      const { reason, detail, candidates } = record.problem;
      return {
        id,
        status: 'needs_attention',
        reason,
        detail,
        candidates,
        message: problemMessage(record.problem),
      };
    }
    case 'failed':
      return {
        id,
        status: 'failed',
        retryable,
        message: retryable
          ? 'Something went wrong. Send the same files again.'
          : 'Something went wrong, and retries are used up.',
      };
    default: {
      const unreachable: never = record;
      return unreachable;
    }
  }
}

/**
 * A drafted capture whose lease expired may have committed before its run
 * died. If the recipe already equals the draft, mark it saved. No model
 * call and no new attempt.
 */
async function settleCommittedDraft(record: CaptureRecord, now: Date): Promise<CaptureRecord> {
  if (record.status !== 'drafted' || record.leaseExpiresAt > now) {
    return record;
  }
  const committed = await findCommittedDraft(record.draft);
  return committed ? markSaved(record, committed, now) : record;
}

async function draftFor(record: RunningRecord, submission: CaptureSubmission): Promise<DraftStep> {
  switch (record.status) {
    case 'drafted': {
      const rechecked = await checkDraft(toDraftInput(record.draft));
      return rechecked.ok
        ? { ok: true, draft: rechecked.draft }
        : {
            ok: false,
            result: {
              kind: 'failed',
              error: `Stored draft no longer passes checkDraft: ${rechecked.errors.join(' ')}`,
            },
          };
    }
    case 'pending': {
      const outcome = await draftRecipe(submission);
      return outcome.ok
        ? outcome
        : { ok: false, result: { kind: 'needs_attention', problem: outcome.problem } };
    }
    default: {
      const unreachable: never = record;
      return unreachable;
    }
  }
}

async function attemptCapture(
  claim: Claim,
  record: RunningRecord,
  submission: CaptureSubmission,
): Promise<CaptureRecord | null> {
  const context = { captureId: claim.captureId, attempt: claim.attempt };
  const drafted = await draftFor(record, submission);
  if (!drafted.ok) {
    return finishCapture(claim, drafted.result);
  }
  if (record.status === 'pending' && !(await saveDraft(claim, drafted.draft))) {
    logger.capture.warn('Capture claim lost before commit', context);
    return null;
  }

  const committed = await commitDraft(drafted.draft);
  const result: CaptureResult = committed.ok
    ? { kind: 'saved', slug: committed.slug, change: committed.change }
    : { kind: 'needs_attention', problem: committed.problem };
  const finished = await finishCapture(claim, result);
  logger.capture.info('Capture finished', {
    ...context,
    result: result.kind,
    recorded: !!finished,
  });
  return finished;
}

/** Never throws for a model or commit failure; those are recorded as a failed attempt. */
async function runCapture(
  claim: Claim,
  record: RunningRecord,
  submission: CaptureSubmission,
): Promise<CaptureRecord | null> {
  return withTrace('capture.run', async (span) => {
    span.setAttributes({
      capture_id: claim.captureId,
      attempt: claim.attempt,
      resumed: record.status === 'drafted',
    });
    try {
      return await attemptCapture(claim, record, submission);
    } catch (error) {
      logger.capture.error('Capture run failed', toError(error), {
        captureId: claim.captureId,
        attempt: claim.attempt,
      });
      return finishCapture(claim, { kind: 'failed', error: toErrorMessage(error) });
    }
  });
}

async function firstOf<T>(work: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit, or resubmit, a capture. The same submission always maps to the
 * same capture:
 * - new key: start a run
 * - running: the current view
 * - stalled or failed with attempts left: claim the next attempt and run
 * - settled: the stored outcome
 * A started run continues in after() past the response. This waits up to
 * CAPTURE_INLINE_WAIT_MS so most captures answer with the final result.
 */
export async function submitCapture(
  submitter: CaptureSubmitter,
  submission: CaptureSubmission,
): Promise<CaptureView> {
  return withTrace('capture.submit', async (span) => {
    span.setAttributes({ intent: submission.intent.kind, media_count: submission.media.length });
    const now = new Date();
    const opened = await openCapture(submitter, submission, now);
    const started = opened.claim
      ? opened
      : await reclaimCapture(await settleCommittedDraft(opened.record, now), now);
    span.setAttributes({
      capture_id: started.record.id,
      attempt: started.record.attempt,
      claimed: started.claim !== null,
    });
    if (!started.claim) {
      return toView(started.record, now);
    }

    const run = runCapture(started.claim, started.record, submission);
    after(run);
    const settled = await firstOf(run, CAPTURE_INLINE_WAIT_MS);
    return toView(settled ?? started.record, new Date());
  });
}

export async function getCapture(id: string): Promise<CaptureView | null> {
  return withTrace('capture.get', async (span) => {
    span.setAttribute('capture_id', id);
    const record = await readCapture(id);
    if (!record) {
      return null;
    }
    const now = new Date();
    return toView(await settleCommittedDraft(record, now), now);
  });
}
