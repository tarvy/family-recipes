import { HomeWidgetDay } from './home-widget-day';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

interface HomeWidgetProps {
  assignments: Array<{
    _id: string;
    title: string;
    thumbnailUrl?: string;
    day: string;
    mealSlot: string;
    recipeSlug?: string;
  }>;
  todayIndex: number;
}

function getAssignmentsForDay(
  assignments: HomeWidgetProps['assignments'],
  day: (typeof DAY_ORDER)[number],
) {
  return assignments
    .filter((assignment) => assignment.day === day)
    .map((assignment) => {
      const dayAssignment: {
        title: string;
        thumbnailUrl?: string;
        recipeSlug?: string;
      } = {
        title: assignment.title,
      };

      if (assignment.thumbnailUrl !== undefined) {
        dayAssignment.thumbnailUrl = assignment.thumbnailUrl;
      }

      if (assignment.recipeSlug !== undefined) {
        dayAssignment.recipeSlug = assignment.recipeSlug;
      }

      return dayAssignment;
    });
}

export function HomeWidget({ assignments, todayIndex }: HomeWidgetProps) {
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">This Week&apos;s Menu</h2>

      <div className="mt-3 overflow-x-auto">
        <div className="flex gap-2 sm:grid sm:grid-cols-7">
          {DAY_ORDER.map((day, index) => (
            <HomeWidgetDay
              key={day}
              dayLabel={DAY_LABELS[day]}
              assignments={getAssignmentsForDay(assignments, day)}
              isToday={index === todayIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
