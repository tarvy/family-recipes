/**
 * Route segment config must be a literal, so the capture route's
 * maxDuration cannot import the lease. This ties them together instead.
 */

import { describe, expect, it } from 'vitest';
import { maxDuration } from '@/app/api/captures/route';
import { MS_PER_SECOND } from '@/lib/constants/time';
import { AGENT_TIMEOUT_MS } from '../agent';
import { CAPTURE_INLINE_WAIT_MS } from '../index';
import { LEASE_MS } from '../store';

describe('capture time budget', () => {
  const routeBudgetMs = maxDuration * MS_PER_SECOND;

  it('gives the lease longer than the route can run, so a live run keeps its claim', () => {
    expect(LEASE_MS).toBeGreaterThan(routeBudgetMs);
  });

  it('aborts the agent and stops the inline wait before the route is killed', () => {
    expect(AGENT_TIMEOUT_MS).toBeLessThan(routeBudgetMs);
    expect(CAPTURE_INLINE_WAIT_MS).toBeLessThan(routeBudgetMs);
  });
});
