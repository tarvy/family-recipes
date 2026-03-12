'use client';

/** Full-screen carousel overlay for viewing fanned recipe stacks. */

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { SerializedAssignment } from './planner-page';

const OVERLAY_Z_INDEX = 50;

const SLOT_DISPLAY_NAMES: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const DAY_DISPLAY_NAMES: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const SOURCE_LABELS: Record<string, string> = {
  cookbook: 'Cookbook',
  discovery: 'Discovery',
};

interface CardFanOverlayProps {
  assignments: SerializedAssignment[];
  onClose: () => void;
  onRemove: (assignmentId: string) => void;
}

export function CardFanOverlay({ assignments, onClose, onRemove }: CardFanOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ zIndex: OVERLAY_Z_INDEX }}
      onClick={handleBackdropClick}
      onKeyDown={() => {}}
      role="dialog"
      aria-modal="true"
      aria-label="Recipe stack detail"
    >
      <div
        className="flex max-w-full gap-4 overflow-x-auto px-8 py-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {assignments.map((assignment) => (
          <OverlayCard key={assignment._id} assignment={assignment} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

interface OverlayCardProps {
  assignment: SerializedAssignment;
  onRemove: (assignmentId: string) => void;
}

function OverlayCard({ assignment, onRemove }: OverlayCardProps) {
  const dayLabel = DAY_DISPLAY_NAMES[assignment.day] ?? assignment.day;
  const slotLabel = SLOT_DISPLAY_NAMES[assignment.mealSlot] ?? assignment.mealSlot;
  const sourceLabel = SOURCE_LABELS[assignment.source] ?? assignment.source;

  return (
    <div
      className={cn(
        'w-72 flex-shrink-0 rounded-xl border border-border bg-card p-5 shadow-lg',
        'space-y-3',
      )}
      style={{ scrollSnapAlign: 'center' }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">{assignment.title}</h3>
        <span
          className={cn(
            'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            assignment.source === 'cookbook'
              ? 'bg-pink-light/30 text-pink-dark'
              : 'bg-lavender/30 text-foreground',
          )}
        >
          {sourceLabel}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {dayLabel} &middot; {slotLabel}
      </p>

      <button
        type="button"
        onClick={() => onRemove(assignment._id)}
        className={cn(
          'w-full rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground',
          'transition-colors hover:border-pink hover:text-foreground',
        )}
      >
        Remove
      </button>
    </div>
  );
}
