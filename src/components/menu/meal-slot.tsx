'use client';

/** Single meal slot column within an expanded day row. */

import { cn } from '@/lib/utils';
import type { SerializedAssignment } from './planner-page';

interface MealSlotProps {
  slot: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  assignments: SerializedAssignment[];
  onRemove: (assignmentId: string) => void;
  disabled: boolean;
  isOver: boolean;
}

export function MealSlot({ slot, label, assignments, onRemove, disabled, isOver }: MealSlotProps) {
  return (
    <div data-slot={slot}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>

      {assignments.length === 0 ? (
        <div
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground text-center',
            isOver && 'border-pink/60',
          )}
        >
          Drop here
        </div>
      ) : (
        <div className="space-y-1">
          {assignments.map((a) => (
            <AssignmentPill key={a._id} assignment={a} onRemove={onRemove} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
}

interface AssignmentPillProps {
  assignment: SerializedAssignment;
  onRemove: (assignmentId: string) => void;
  disabled: boolean;
}

function AssignmentPill({ assignment, onRemove, disabled }: AssignmentPillProps) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-pink-light/20 px-2 py-1 text-xs">
      <span className="flex-1 truncate text-foreground">{assignment.title}</span>
      {!disabled && (
        <button
          type="button"
          onClick={() => onRemove(assignment._id)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Remove ${assignment.title}`}
        >
          {'\u00d7'}
        </button>
      )}
    </div>
  );
}
