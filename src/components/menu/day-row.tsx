'use client';

/** Single day row with drop target and expandable meal slot columns. */

import type { DayOfWeek } from '@/db/types';
import { cn } from '@/lib/utils';
import { CardFan } from './card-fan';
import type { DraggedRecipe } from './drag-context';
import { MealSlot } from './meal-slot';
import type { SerializedAssignment } from './planner-page';
import { useDropTarget } from './use-drop-target';

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

const SLOT_LABELS: Record<(typeof MEAL_SLOTS)[number], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const MULTI_CARD_THRESHOLD = 2;

interface DayRowProps {
  day: DayOfWeek;
  label: string;
  assignments: SerializedAssignment[];
  onDrop: (recipe: DraggedRecipe, day: string, slot: string) => void;
  onRemove: (assignmentId: string) => void;
  onFanTap: (assignments: SerializedAssignment[]) => void;
  disabled: boolean;
}

function filterBySlot(assignments: SerializedAssignment[], slot: string): SerializedAssignment[] {
  return assignments.filter((a) => a.mealSlot === slot);
}

export function DayRow({
  day,
  label,
  assignments,
  onDrop,
  onRemove,
  onFanTap,
  disabled,
}: DayRowProps) {
  const { ref, isOver, isExpanded } = useDropTarget(day, onDrop);

  return (
    <div
      ref={ref}
      className={cn(
        'p-3 transition-all duration-200',
        isOver && !disabled && 'bg-pink-light/50',
        disabled && 'opacity-60',
      )}
    >
      <div className="mb-1 text-sm font-semibold text-foreground">{label}</div>

      {isExpanded && !disabled ? (
        <div className="grid grid-cols-3 gap-2">
          {MEAL_SLOTS.map((slot) => (
            <MealSlot
              key={slot}
              slot={slot}
              label={SLOT_LABELS[slot]}
              assignments={filterBySlot(assignments, slot)}
              onRemove={onRemove}
              disabled={disabled}
              isOver={isOver}
            />
          ))}
        </div>
      ) : (
        <CollapsedAssignments
          assignments={assignments}
          onRemove={onRemove}
          onFanTap={onFanTap}
          disabled={disabled}
        />
      )}
    </div>
  );
}

interface CollapsedAssignmentsProps {
  assignments: SerializedAssignment[];
  onRemove: (assignmentId: string) => void;
  onFanTap: (assignments: SerializedAssignment[]) => void;
  disabled: boolean;
}

function CollapsedAssignments({
  assignments,
  onRemove,
  onFanTap,
  disabled,
}: CollapsedAssignmentsProps) {
  if (assignments.length === 0) {
    return <p className="text-xs text-muted-foreground">No meals planned</p>;
  }

  const grouped = groupBySlot(assignments);

  return (
    <div className="flex flex-wrap gap-2">
      {MEAL_SLOTS.map((slot) => {
        const slotAssignments = grouped[slot];
        if (slotAssignments.length === 0) {
          return null;
        }

        if (slotAssignments.length >= MULTI_CARD_THRESHOLD) {
          return (
            <CardFan
              key={slot}
              assignments={slotAssignments}
              onTap={onFanTap}
              onRemove={onRemove}
              disabled={disabled}
            />
          );
        }

        return slotAssignments.map((a) => (
          <span
            key={a._id}
            className="inline-flex items-center gap-1 rounded-full bg-pink-light/30 px-2 py-0.5 text-xs text-foreground"
          >
            {a.title}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(a._id)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${a.title}`}
              >
                {'\u00d7'}
              </button>
            )}
          </span>
        ));
      })}
    </div>
  );
}

function groupBySlot(
  assignments: SerializedAssignment[],
): Record<(typeof MEAL_SLOTS)[number], SerializedAssignment[]> {
  const groups: Record<(typeof MEAL_SLOTS)[number], SerializedAssignment[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  for (const assignment of assignments) {
    const slot = assignment.mealSlot;
    if (slot in groups) {
      groups[slot as (typeof MEAL_SLOTS)[number]].push(assignment);
    }
  }

  return groups;
}
