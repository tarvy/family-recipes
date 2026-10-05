'use client';

/** Shareable voting link + vote tally shown while a menu's survey is open. */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui';

/** How long the "Copied" confirmation stays visible. */
const COPIED_RESET_MS = 2000;

interface SurveyShareProps {
  votingToken: string;
  votingClosesAt?: string;
  voterNames: string[];
}

function formatClosesAt(votingClosesAt: string | undefined): string | null {
  if (!votingClosesAt) {
    return null;
  }
  const closes = new Date(votingClosesAt);
  if (Number.isNaN(closes.getTime())) {
    return null;
  }
  return closes.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function describeVoters(voterNames: string[]): string {
  if (voterNames.length === 0) {
    return 'No votes yet.';
  }
  const noun = voterNames.length === 1 ? 'vote' : 'votes';
  return `${voterNames.length} ${noun} so far: ${voterNames.join(', ')}`;
}

export function SurveyShare({ votingToken, votingClosesAt, voterNames }: SurveyShareProps) {
  const [votingUrl, setVotingUrl] = useState(`/vote/${votingToken}`);
  const [copied, setCopied] = useState(false);

  // Build the absolute link on the client so it matches the host the user is on.
  useEffect(() => {
    setVotingUrl(`${window.location.origin}/vote/${votingToken}`);
  }, [votingToken]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(votingUrl);
      setCopied(true);
    } catch {
      window.prompt('Copy this voting link:', votingUrl);
    }
  }, [votingUrl]);

  const closesAt = formatClosesAt(votingClosesAt);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Share this link so the family can vote</p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={votingUrl}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-sm text-primary underline"
        >
          {votingUrl}
        </a>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {describeVoters(voterNames)}
        {closesAt ? ` Voting closes ${closesAt}.` : ''}
      </p>
    </div>
  );
}
