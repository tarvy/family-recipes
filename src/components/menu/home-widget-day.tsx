import Link from 'next/link';
import { cn } from '@/lib/utils';

const MAX_VISIBLE_ASSIGNMENTS = 2;

interface HomeWidgetDayProps {
  dayLabel: string;
  assignments: Array<{
    title: string;
    thumbnailUrl?: string;
    recipeSlug?: string;
  }>;
  isToday: boolean;
}

function AssignmentItem({ assignment }: { assignment: HomeWidgetDayProps['assignments'][number] }) {
  const content = (
    <div className="space-y-1 rounded-lg bg-card-nested p-1.5">
      {assignment.thumbnailUrl ? (
        <div
          className="h-10 w-full rounded-md bg-cover bg-center"
          style={{ backgroundImage: `url(${assignment.thumbnailUrl})` }}
          role="img"
          aria-label={assignment.title}
        />
      ) : null}
      <p className="line-clamp-2 text-xs text-foreground">{assignment.title}</p>
    </div>
  );

  if (!assignment.recipeSlug) {
    return content;
  }

  return (
    <Link href={`/recipes/${assignment.recipeSlug}`} className="block">
      {content}
    </Link>
  );
}

export function HomeWidgetDay({ dayLabel, assignments, isToday }: HomeWidgetDayProps) {
  const visibleAssignments = assignments.slice(0, MAX_VISIBLE_ASSIGNMENTS);

  return (
    <div
      className={cn(
        'min-h-28 w-24 rounded-xl p-2 sm:w-auto',
        isToday ? 'bg-pink' : 'bg-card-nested',
      )}
    >
      <p
        className={cn(
          'mb-2 text-xs font-medium',
          isToday ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {dayLabel}
      </p>

      {visibleAssignments.length > 0 ? (
        <div className="space-y-1.5">
          {visibleAssignments.map((assignment) => (
            <AssignmentItem
              key={`${assignment.recipeSlug ?? assignment.title}-${assignment.title}`}
              assignment={assignment}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          -
        </div>
      )}
    </div>
  );
}
