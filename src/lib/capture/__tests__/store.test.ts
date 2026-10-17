/**
 * Capture storage: the unique key decides concurrent submits, a live lease
 * cannot be reclaimed, and a stale claim cannot write over a newer attempt.
 */

import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { setupMemoryMongo } from '@/db/__tests__/memory-mongo';
import { Capture } from '@/db/models/capture.model';
import {
  type Claim,
  finishCapture,
  LEASE_MS,
  type OpenedCapture,
  openCapture,
  reclaimCapture,
  saveDraft,
} from '../store';
import { CHILI_SLUG, captureForm, newChiliDraft, submissionFor } from './fixtures';

setupMemoryMongo();

const SUBMITTER = { userId: new Types.ObjectId().toString(), keyId: 'testdevice000000' };

function claimOf(opened: OpenedCapture): Claim {
  if (!opened.claim) {
    throw new Error('Expected a claim');
  }
  return opened.claim;
}

describe('capture store', () => {
  it('lets exactly one of two concurrent submits claim the capture', async () => {
    const submission = await submissionFor(captureForm());
    const now = new Date();

    const opened = await Promise.all([
      openCapture(SUBMITTER, submission, now),
      openCapture(SUBMITTER, submission, now),
    ]);

    expect(opened.filter(({ claim }) => claim !== null)).toHaveLength(1);
    expect(await Capture.countDocuments()).toBe(1);
  });

  it('does not reclaim a capture whose lease is still live', async () => {
    const now = new Date();
    const { record } = await openCapture(SUBMITTER, await submissionFor(captureForm()), now);

    const reclaimed = await reclaimCapture(record, now);

    expect(reclaimed.claim).toBeNull();
    expect(reclaimed.record.attempt).toBe(record.attempt);
  });

  it('fences out a stale claim once a newer attempt reclaims the capture', async () => {
    const started = new Date();
    const first = await openCapture(SUBMITTER, await submissionFor(captureForm()), started);
    const second = await reclaimCapture(first.record, new Date(started.getTime() + LEASE_MS));
    const staleClaim = claimOf(first);
    const freshClaim = claimOf(second);
    const draft = await newChiliDraft();

    expect(freshClaim.attempt).toBe(staleClaim.attempt + 1);
    expect(await saveDraft(staleClaim, draft)).toBeNull();
    expect(await finishCapture(staleClaim, { kind: 'failed', error: 'stale run' })).toBeNull();

    expect(await saveDraft(freshClaim, draft)).toMatchObject({ status: 'drafted' });
    const finished = await finishCapture(freshClaim, {
      kind: 'saved',
      slug: CHILI_SLUG,
      change: 'created',
    });
    expect(finished).toMatchObject({ status: 'saved', attempt: freshClaim.attempt });
  });
});
