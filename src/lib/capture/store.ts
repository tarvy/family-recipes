/**
 * Capture records: storage for the capture state machine.
 *
 * A Claim is the fencing token for one attempt. Run writes (saveDraft,
 * finishCapture) take a Claim and filter on capture id and attempt, so a
 * stale run cannot overwrite a newer attempt. Rows leave this module as a
 * CaptureRecord union, never as optional-field documents.
 */

import mongoose, { type Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { Capture } from '@/db/models/capture.model';
import type { CaptureChange, CaptureMediaKind, ICapture, ICaptureDraft } from '@/db/types';
import { isDuplicateKeyError } from '@/lib/errors';
import { isRecipeCategory } from '@/lib/recipes/categories';
import { traceDbQuery, withTrace } from '@/lib/telemetry';
import type { CaptureProblem, Draft, DraftTarget, StoredDraft } from './draft';
import type { CaptureIntent, CaptureSubmission, CaptureSubmitter } from './submission';

/** Must exceed the capture route's maxDuration (60 s) so a live run never loses its lease. Tested. */
export const LEASE_MS = 75_000;
export const MAX_ATTEMPTS = 3;
const COLLECTION_NAME = 'captures';
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const claimed: unique symbol = Symbol('Claim');

/** Proof this invocation owns `attempt` of `captureId`. Minted only by openCapture and reclaimCapture. */
export interface Claim {
  readonly captureId: string;
  readonly attempt: number;
  readonly [claimed]: true;
}

interface StoredMedia {
  readonly kind: CaptureMediaKind;
  readonly mediaType: string;
  readonly bytes: number;
  readonly sha256: string;
}

interface CaptureCommon {
  readonly id: string;
  readonly key: string;
  readonly submittedBy: CaptureSubmitter;
  readonly intent: CaptureIntent;
  readonly media: readonly StoredMedia[];
  readonly attempt: number;
  readonly createdAt: Date;
}

export type CaptureRecord =
  | (CaptureCommon & { readonly status: 'pending'; readonly leaseExpiresAt: Date })
  | (CaptureCommon & {
      readonly status: 'drafted';
      readonly leaseExpiresAt: Date;
      readonly draft: StoredDraft;
    })
  | (CaptureCommon & {
      readonly status: 'saved';
      readonly draft: StoredDraft;
      readonly slug: string;
      readonly change: CaptureChange;
    })
  | (CaptureCommon & {
      readonly status: 'needs_attention';
      readonly problem: CaptureProblem;
      readonly draft: StoredDraft | null;
    })
  | (CaptureCommon & {
      readonly status: 'failed';
      readonly error: string;
      readonly draft: StoredDraft | null;
    });

export type RunningRecord = Extract<CaptureRecord, { status: 'pending' | 'drafted' }>;
export type DraftedRecord = Extract<CaptureRecord, { status: 'drafted' }>;
type ReclaimableRecord = Extract<CaptureRecord, { status: 'pending' | 'drafted' | 'failed' }>;

export type CaptureResult =
  | { readonly kind: 'saved'; readonly slug: string; readonly change: CaptureChange }
  | { readonly kind: 'needs_attention'; readonly problem: CaptureProblem }
  | { readonly kind: 'failed'; readonly error: string };

export type OpenedCapture =
  | { readonly record: RunningRecord; readonly claim: Claim }
  | { readonly record: CaptureRecord; readonly claim: null };

type CaptureRow = ICapture & { _id: Types.ObjectId };

function invalidRow(row: CaptureRow, field: string): Error {
  return new Error(`Capture ${row._id.toString()} is ${row.status} without ${field}`);
}

function present<T>(value: T | null | undefined, row: CaptureRow, field: string): T {
  if (value === null || value === undefined) {
    throw invalidRow(row, field);
  }
  return value;
}

function toTarget(target: ICaptureDraft['target'], row: CaptureRow): DraftTarget {
  switch (target.kind) {
    case 'new':
      return { kind: 'new' };
    case 'change':
      return {
        kind: 'change',
        slug: present(target.slug, row, 'draft.target.slug'),
        baseCooklang: present(target.baseCooklang, row, 'draft.target.baseCooklang'),
      };
    default: {
      const unreachable: never = target.kind;
      return unreachable;
    }
  }
}

function toStoredDraft(draft: ICaptureDraft, row: CaptureRow): StoredDraft {
  const { cooklang, category, title, slug, warnings, target } = draft;
  if (!isRecipeCategory(category)) {
    throw invalidRow(row, 'a known draft category');
  }
  return {
    cooklang,
    category,
    title,
    slug,
    warnings: [...warnings],
    target: toTarget(target, row),
  };
}

function toIntent(intent: ICapture['intent']): CaptureIntent {
  return intent.kind === 'add' ? { kind: 'add' } : { kind: 'change', slug: intent.slug ?? null };
}

function toRecord(row: CaptureRow): CaptureRecord {
  const common: CaptureCommon = {
    id: row._id.toString(),
    key: row.key,
    submittedBy: { userId: row.submittedBy.userId.toString(), keyId: row.submittedBy.keyId },
    intent: toIntent(row.intent),
    media: row.media.map(({ kind, mediaType, bytes, sha256 }) => ({
      kind,
      mediaType,
      bytes,
      sha256,
    })),
    attempt: row.attempt,
    createdAt: row.createdAt,
  };
  const draft = row.draft ? toStoredDraft(row.draft, row) : null;

  switch (row.status) {
    case 'pending':
      return {
        ...common,
        status: 'pending',
        leaseExpiresAt: present(row.leaseExpiresAt, row, 'leaseExpiresAt'),
      };
    case 'drafted':
      return {
        ...common,
        status: 'drafted',
        leaseExpiresAt: present(row.leaseExpiresAt, row, 'leaseExpiresAt'),
        draft: present(draft, row, 'draft'),
      };
    case 'saved':
      return {
        ...common,
        status: 'saved',
        draft: present(draft, row, 'draft'),
        slug: present(row.savedSlug, row, 'savedSlug'),
        change: present(row.change, row, 'change'),
      };
    case 'needs_attention': {
      const { reason, detail, candidates } = present(row.problem, row, 'problem');
      return {
        ...common,
        status: 'needs_attention',
        problem: { reason, detail, candidates: [...candidates] },
        draft,
      };
    }
    case 'failed':
      return { ...common, status: 'failed', error: row.errorMessage ?? 'unknown', draft };
    default: {
      const unreachable: never = row.status;
      return unreachable;
    }
  }
}

function toDraftRow(draft: StoredDraft): ICaptureDraft {
  const { target } = draft;
  return {
    cooklang: draft.cooklang,
    category: draft.category,
    title: draft.title,
    slug: draft.slug,
    warnings: [...draft.warnings],
    target:
      target.kind === 'new'
        ? { kind: 'new', slug: null, baseCooklang: null }
        : { kind: 'change', slug: target.slug, baseCooklang: target.baseCooklang },
  };
}

function resultFields(result: CaptureResult): Partial<ICapture> {
  switch (result.kind) {
    case 'saved':
      return { status: 'saved', savedSlug: result.slug, change: result.change };
    case 'needs_attention': {
      const { reason, detail, candidates } = result.problem;
      return {
        status: 'needs_attention',
        problem: { reason, detail, candidates: [...candidates] },
      };
    }
    case 'failed':
      return { status: 'failed', errorMessage: result.error };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

function leaseFrom(now: Date): Date {
  return new Date(now.getTime() + LEASE_MS);
}

function claimOpened(row: CaptureRow): OpenedCapture {
  const record = toRecord(row);
  if (record.status !== 'pending' && record.status !== 'drafted') {
    throw invalidRow(row, 'a running status after a claim');
  }
  return { record, claim: { captureId: record.id, attempt: record.attempt, [claimed]: true } };
}

function isReclaimable(record: CaptureRecord, now: Date): record is ReclaimableRecord {
  if (record.attempt >= MAX_ATTEMPTS) {
    return false;
  }
  switch (record.status) {
    case 'pending':
    case 'drafted':
      return record.leaseExpiresAt <= now;
    case 'failed':
      return true;
    case 'saved':
    case 'needs_attention':
      return false;
    default: {
      const unreachable: never = record;
      return unreachable;
    }
  }
}

/** A row with a draft resumes at commit; one without drafts again. */
function resumeStatus(record: ReclaimableRecord): RunningRecord['status'] {
  switch (record.status) {
    case 'pending':
      return 'pending';
    case 'drafted':
      return 'drafted';
    case 'failed':
      return record.draft ? 'drafted' : 'pending';
    default: {
      const unreachable: never = record;
      return unreachable;
    }
  }
}

async function findRow(filter: Record<string, unknown>): Promise<CaptureRow | null> {
  await connectDB();
  return traceDbQuery('findOne', COLLECTION_NAME, () =>
    Capture.findOne(filter).lean<CaptureRow>().exec(),
  );
}

async function updateRow(
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
): Promise<CaptureRow | null> {
  await connectDB();
  return traceDbQuery('findOneAndUpdate', COLLECTION_NAME, () =>
    Capture.findOneAndUpdate(filter, update, { new: true }).lean<CaptureRow>().exec(),
  );
}

/**
 * Insert a pending capture for this key and claim attempt 1, or return the
 * existing row without a claim. The unique index on `key` decides races.
 */
export async function openCapture(
  submitter: CaptureSubmitter,
  submission: CaptureSubmission,
  now: Date,
): Promise<OpenedCapture> {
  return withTrace('capture.store.open', async (span) => {
    await connectDB();
    await Capture.init();
    const { intent } = submission;

    try {
      const created = await traceDbQuery('create', COLLECTION_NAME, () =>
        Capture.create({
          key: submission.key,
          submittedBy: {
            userId: new mongoose.Types.ObjectId(submitter.userId),
            keyId: submitter.keyId,
          },
          intent: { kind: intent.kind, slug: intent.kind === 'change' ? intent.slug : null },
          media: submission.media.map(({ kind, mediaType, bytes, sha256 }) => ({
            kind,
            mediaType,
            bytes: bytes.byteLength,
            sha256,
          })),
          status: 'pending',
          attempt: 1,
          leaseExpiresAt: leaseFrom(now),
        }),
      );
      span.setAttribute('created', true);
      return claimOpened(created.toObject<CaptureRow>());
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    span.setAttribute('created', false);
    const existing = await findRow({ key: submission.key });
    if (!existing) {
      throw new Error('Capture key collided, but no capture has that key');
    }
    return { record: toRecord(existing), claim: null };
  });
}

/**
 * Claim the next attempt of a stalled or failed capture with attempts left.
 * Compare-and-swap on the attempt and status that were read, so only one
 * caller wins. Anyone else gets the current record and no claim.
 */
export async function reclaimCapture(record: CaptureRecord, now: Date): Promise<OpenedCapture> {
  return withTrace('capture.store.reclaim', async (span) => {
    span.setAttributes({ capture_id: record.id, attempt: record.attempt, status: record.status });
    if (!isReclaimable(record, now)) {
      return { record, claim: null };
    }

    const row = await updateRow(
      { _id: record.id, attempt: record.attempt, status: record.status },
      {
        $set: {
          status: resumeStatus(record),
          leaseExpiresAt: leaseFrom(now),
          problem: null,
          errorMessage: null,
        },
        $inc: { attempt: 1 },
      },
    );
    if (!row) {
      return { record: (await readCapture(record.id)) ?? record, claim: null };
    }
    return claimOpened(row);
  });
}

/** pending to drafted. null means the claim was lost to a newer attempt. */
export async function saveDraft(claim: Claim, draft: Draft): Promise<CaptureRecord | null> {
  return withTrace('capture.store.saveDraft', async () => {
    const row = await updateRow(
      { _id: claim.captureId, attempt: claim.attempt, status: 'pending' },
      { $set: { status: 'drafted', draft: toDraftRow(draft) } },
    );
    return row ? toRecord(row) : null;
  });
}

/** pending or drafted to an outcome. Clears the lease. null means the claim was lost. */
export async function finishCapture(
  claim: Claim,
  result: CaptureResult,
): Promise<CaptureRecord | null> {
  return withTrace('capture.store.finish', async (span) => {
    span.setAttributes({
      capture_id: claim.captureId,
      attempt: claim.attempt,
      result: result.kind,
    });
    const row = await updateRow(
      { _id: claim.captureId, attempt: claim.attempt, status: { $in: ['pending', 'drafted'] } },
      { $set: { ...resultFields(result), leaseExpiresAt: null } },
    );
    return row ? toRecord(row) : null;
  });
}

/**
 * Mark a drafted capture saved after its commit landed but its run died
 * before recording it. Only once the lease expired, and without a new attempt.
 */
export async function markSaved(
  record: DraftedRecord,
  committed: { readonly slug: string; readonly change: CaptureChange },
  now: Date,
): Promise<CaptureRecord> {
  return withTrace('capture.store.markSaved', async () => {
    const row = await updateRow(
      { _id: record.id, attempt: record.attempt, status: 'drafted', leaseExpiresAt: { $lte: now } },
      {
        $set: {
          status: 'saved',
          savedSlug: committed.slug,
          change: committed.change,
          leaseExpiresAt: null,
        },
      },
    );
    return row ? toRecord(row) : ((await readCapture(record.id)) ?? record);
  });
}

export async function readCapture(id: string): Promise<CaptureRecord | null> {
  return withTrace('capture.store.read', async () => {
    if (!OBJECT_ID_PATTERN.test(id)) {
      return null;
    }
    const row = await findRow({ _id: id });
    return row ? toRecord(row) : null;
  });
}
