'use client';

/** 7-day calendar grid container for the weekly menu planner. */

import type { DayOfWeek } from '@/db/types';
import { DayRow } from './day-row';
import type { DraggedRecipe } from './drag-context';
import type { SerializedAssignment } from './planner-page';

const DAYS_OF_WEEK: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

interface CalendarGridProps {
  assignments: SerializedAssignment[];
  onAssign: (recipe: DraggedRecipe, day: string, slot: string) => void;
  onRemove: (assignmentId: string) => void;
  onFanTap: (assignments: SerializedAssignment[]) => void;
  menuStatus: 'building' | 'survey-sent' | 'locked-in';
}

function groupByDay(
  assignments: SerializedAssignment[],
): Record<DayOfWeek, SerializedAssignment[]> {
  const groups: Record<DayOfWeek, SerializedAssignment[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  for (const assignment of assignments) {
    groups[assignment.day].push(assignment);
  }

  return groups;
}

export function CalendarGrid({
  assignments,
  onAssign,
  onRemove,
  onFanTap,
  menuStatus,
}: CalendarGridProps) {
  const grouped = groupByDay(assignments);
  const disabled = menuStatus === 'locked-in';

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card shadow-sm">
      {DAYS_OF_WEEK.map((day) => (
        <DayRow
          key={day}
          day={day}
          label={DAY_LABELS[day]}
          assignments={grouped[day]}
          onDrop={onAssign}
          onRemove={onRemove}
          onFanTap={onFanTap}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
