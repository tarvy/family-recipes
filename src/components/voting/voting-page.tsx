'use client';

/** Client voting flow: select candidates, enter name, and submit vote. */

import { useEffect, useRef, useState } from 'react';
import { generateFingerprint } from '@/lib/fingerprint';
import { cn } from '@/lib/utils';
import { RecipeCandidate } from './recipe-candidate';
import { VoterNameInput } from './voter-name-input';

const CHECKMARK_ICON = '\u2713';

interface VotingAssignment {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  source: string;
  day: string;
  mealSlot: string;
}

interface ExistingVote {
  voterName: string;
  voterToken: string;
  picks: string[];
  votedAt: string;
}

interface VotingPageProps {
  assignments: VotingAssignment[];
  token: string;
  existingVotes: ExistingVote[];
}

interface VoteApiError {
  error?: string;
}

export function VotingPage({ assignments, token, existingVotes }: VotingPageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [voterName, setVoterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeFingerprint = async () => {
      const fingerprint = await generateFingerprint();
      if (!mounted) {
        return;
      }

      fingerprintRef.current = fingerprint;
      const existingVote = existingVotes.find((vote) => vote.voterToken === fingerprint);
      if (!existingVote) {
        return;
      }

      setSelectedIds(new Set(existingVote.picks));
      setVoterName(existingVote.voterName);
    };

    initializeFingerprint().catch(() => {
      setError('Unable to initialize voting on this device.');
    });

    return () => {
      mounted = false;
    };
  }, [existingVotes]);

  const toggleSelection = (assignmentId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
    setError(null);
  };

  const submitVote = async () => {
    const trimmedName = voterName.trim();
    const fingerprint = fingerprintRef.current;

    if (!(trimmedName && fingerprint) || selectedIds.size === 0) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/vote/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: trimmedName,
          voterToken: fingerprint,
          picks: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as VoteApiError;
        throw new Error(body.error ?? 'Failed to submit vote');
      }

      setIsSubmitted(true);
    } catch (submitError) {
      const fallbackMessage = 'Unable to submit your vote right now.';
      if (submitError instanceof Error && submitError.message) {
        setError(submitError.message);
      } else {
        setError(fallbackMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-pink text-xl text-foreground">
          {CHECKMARK_ICON}
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Thanks, {voterName.trim()}!</h1>
        <p className="mt-2 text-muted-foreground">Your vote has been saved.</p>
        <button
          type="button"
          onClick={() => setIsSubmitted(false)}
          className="mt-6 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          Change Vote
        </button>
      </section>
    );
  }

  const isSubmitDisabled = selectedIds.size === 0 || !voterName.trim() || isSubmitting;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-foreground">Vote for Your Favorites</h1>
        <p className="mt-2 text-muted-foreground">Tap recipes you want this week</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {assignments.map((assignment) => (
          <RecipeCandidate
            key={assignment._id}
            assignment={assignment}
            isSelected={selectedIds.has(assignment._id)}
            onToggle={toggleSelection}
          />
        ))}
      </div>

      <VoterNameInput value={voterName} onChange={setVoterName} disabled={isSubmitting} />

      {error && (
        <p className="rounded-lg border border-pink-dark bg-pink-light px-4 py-2 text-sm text-foreground">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          submitVote().catch((submitError: unknown) => {
            const message =
              submitError instanceof Error && submitError.message
                ? submitError.message
                : 'Unable to submit your vote right now.';
            setError(message);
          });
        }}
        disabled={isSubmitDisabled}
        className={cn(
          'w-full rounded-lg bg-pink px-4 py-3 font-semibold text-foreground transition-colors',
          'hover:bg-pink-dark',
          isSubmitDisabled && 'cursor-not-allowed opacity-60 hover:bg-pink',
        )}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </button>
    </section>
  );
}
