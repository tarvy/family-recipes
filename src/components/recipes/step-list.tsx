interface Timer {
  duration: number;
  unit: string;
}

interface Step {
  text: string;
  timers?: Timer[];
}

interface StepListProps {
  steps: Step[];
}

/**
 * Display recipe steps with numbered instructions
 *
 * Features:
 * - Numbered steps with decorative styling
 * - Timer badges for steps with timing info
 * - Clear, readable formatting
 */
export function StepList({ steps }: StepListProps) {
  if (steps.length === 0) {
    return (
      <p className="text-muted-foreground italic">No instructions available for this recipe.</p>
    );
  }

  return (
    <ol className="space-y-6">
      {steps.map((step, index) => (
        <li key={createStepKey(step, index)} className="flex gap-4">
          {/* Step number */}
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lavender text-sm font-semibold text-white">
            {index + 1}
          </span>

          {/* Step content */}
          <div className="flex-1 pt-1">
            <p className="text-foreground leading-relaxed">{step.text}</p>

            {/* Timer badges */}
            {step.timers && step.timers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {step.timers.map((timer) => (
                  <span
                    key={createTimerKey(timer)}
                    className="inline-flex items-center gap-1 rounded-full bg-yellow px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    <ClockIcon />
                    {formatTimer(timer)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Create a stable key for a step
 */
function createStepKey(step: Step, index: number): string {
  // Use first 20 chars of text + index for uniqueness
  return `step-${index}-${step.text.slice(0, 20).replace(/\s+/g, '-')}`;
}

/**
 * Create a stable key for a timer
 */
function createTimerKey(timer: Timer): string {
  return `timer-${timer.duration}-${timer.unit}`;
}

/**
 * Format timer for display
 */
function formatTimer(timer: Timer): string {
  const { duration, unit } = timer;

  // Normalize unit display
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.startsWith('min')) {
    return duration === 1 ? '1 minute' : `${duration} minutes`;
  }

  if (normalizedUnit.startsWith('hour') || normalizedUnit === 'hr' || normalizedUnit === 'hrs') {
    return duration === 1 ? '1 hour' : `${duration} hours`;
  }

  if (normalizedUnit.startsWith('sec')) {
    return duration === 1 ? '1 second' : `${duration} seconds`;
  }

  return `${duration} ${unit}`;
}

/**
 * Small clock icon for timer badges
 */
function ClockIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
    </svg>
  );
}
