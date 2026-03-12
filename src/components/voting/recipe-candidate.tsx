'use client';

/** Tappable recipe card used to toggle voting selection state. */

import { cn } from '@/lib/utils';

const FALLBACK_EMOJI = '\ud83c\udf7d\ufe0f';

interface RecipeCandidateProps {
  assignment: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
    day: string;
    mealSlot: string;
  };
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function capitalizeDay(day: string): string {
  if (!day) {
    return day;
  }

  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function RecipeCandidate({ assignment, isSelected, onToggle }: RecipeCandidateProps) {
  const hasThumbnail = Boolean(assignment.thumbnailUrl);

  return (
    <button
      type="button"
      onClick={() => onToggle(assignment._id)}
      className={cn(
        'bg-card border border-border rounded-xl p-4 text-left transition-all duration-150 hover:shadow-md',
        isSelected && 'ring-2 ring-lavender scale-[1.02]',
      )}
      aria-pressed={isSelected}
    >
      {hasThumbnail ? (
        <div
          className="mb-3 h-28 w-full rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${assignment.thumbnailUrl})` }}
          role="img"
          aria-label={assignment.title}
        />
      ) : (
        <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-lavender-light text-3xl">
          {assignment.title.charAt(0).toUpperCase() || FALLBACK_EMOJI}
        </div>
      )}

      <p className="text-lg font-semibold text-foreground">{assignment.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {capitalizeDay(assignment.day)} - {assignment.mealSlot}
      </p>
    </button>
  );
}
