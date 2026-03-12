/** Public vote page loaded by shared voting token. */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VotingClosed } from '@/components/voting/voting-closed';
import { VotingPage } from '@/components/voting/voting-page';
import { findByVotingToken } from '@/lib/menu/repository';

const MAX_CONTENT_WIDTH_CLASS = 'mx-auto max-w-2xl px-6 py-8';

interface VotePageProps {
  params: Promise<{ token: string }>;
}

interface SerializedAssignment {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  source: string;
  day: string;
  mealSlot: string;
}

interface SerializedVote {
  voterName: string;
  voterToken: string;
  picks: string[];
  votedAt: string;
}

interface SerializedMenuData {
  assignments: SerializedAssignment[];
  votes: SerializedVote[];
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vote — Family Recipes',
    robots: { index: false, follow: false },
  };
}

function serializeAssignments(assignments: SerializedAssignment[]): SerializedAssignment[] {
  return assignments.map((assignment) => {
    const serialized: SerializedAssignment = {
      _id: assignment._id,
      title: assignment.title,
      source: assignment.source,
      day: assignment.day,
      mealSlot: assignment.mealSlot,
    };

    if (assignment.thumbnailUrl) {
      serialized.thumbnailUrl = assignment.thumbnailUrl;
    }

    return serialized;
  });
}

function serializeVotes(votes: SerializedVote[]): SerializedVote[] {
  return votes.map((vote) => ({
    voterName: vote.voterName,
    voterToken: vote.voterToken,
    picks: vote.picks.map((pick) => String(pick)),
    votedAt: vote.votedAt,
  }));
}

export default async function VotePage({ params }: VotePageProps) {
  const { token } = await params;
  const menu = await findByVotingToken(token);

  if (!menu) {
    notFound();
  }

  const serializedMenu = JSON.parse(JSON.stringify(menu)) as SerializedMenuData;
  const assignments = serializeAssignments(serializedMenu.assignments);

  if (menu.status === 'locked-in') {
    return (
      <div className="min-h-screen bg-background">
        <div className={MAX_CONTENT_WIDTH_CLASS}>
          <VotingClosed assignments={assignments} />
        </div>
      </div>
    );
  }

  const isVotingExpired =
    menu.votingClosesAt !== undefined &&
    menu.votingClosesAt !== null &&
    new Date() > menu.votingClosesAt;

  if (isVotingExpired) {
    return (
      <div className="min-h-screen bg-background">
        <div className={MAX_CONTENT_WIDTH_CLASS}>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground">Voting has ended</h1>
            <p className="mt-2 text-muted-foreground">This voting window is no longer open.</p>
          </div>
        </div>
      </div>
    );
  }

  const existingVotes = serializeVotes(serializedMenu.votes);

  return (
    <div className="min-h-screen bg-background">
      <div className={MAX_CONTENT_WIDTH_CLASS}>
        <VotingPage assignments={assignments} token={token} existingVotes={existingVotes} />
      </div>
    </div>
  );
}
