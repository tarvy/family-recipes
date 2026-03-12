/** Read-only finalized menu view for closed or locked-in voting states. */

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

interface VotingClosedProps {
  assignments: Array<{
    _id: string;
    title: string;
    day: string;
    mealSlot: string;
    thumbnailUrl?: string;
  }>;
}

function groupAssignmentsByDay(assignments: VotingClosedProps['assignments']) {
  return assignments.reduce<Record<string, VotingClosedProps['assignments']>>(
    (grouped, assignment) => {
      const list = grouped[assignment.day] ?? [];
      grouped[assignment.day] = [...list, assignment];
      return grouped;
    },
    {},
  );
}

export function VotingClosed({ assignments }: VotingClosedProps) {
  const assignmentsByDay = groupAssignmentsByDay(assignments);

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Voting Closed</h1>
        <p className="mt-2 text-muted-foreground">This week's menu has been finalized</p>
      </header>

      <div className="grid gap-4">
        {DAY_ORDER.map((day) => {
          const dayAssignments = assignmentsByDay[day] ?? [];

          return (
            <article key={day} className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {DAY_LABELS[day]}
              </h2>

              {dayAssignments.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {dayAssignments.map((assignment) => (
                    <li
                      key={assignment._id}
                      className="flex items-center gap-3 rounded-lg bg-background p-3"
                    >
                      {assignment.thumbnailUrl ? (
                        <div
                          className="h-12 w-12 shrink-0 rounded-md bg-cover bg-center"
                          style={{ backgroundImage: `url(${assignment.thumbnailUrl})` }}
                          role="img"
                          aria-label={assignment.title}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-lavender-light text-lg text-foreground">
                          {assignment.title.charAt(0).toUpperCase() || 'R'}
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-foreground">{assignment.title}</p>
                        <p className="text-sm capitalize text-muted-foreground">
                          {assignment.mealSlot}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No recipe assigned.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
