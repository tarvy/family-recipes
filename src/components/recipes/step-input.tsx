'use client';

/**
 * Dynamic step list input component
 *
 * Allows adding/removing step textareas for recipe instructions.
 */

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/** Default number of rows for step textarea */
const TEXTAREA_ROWS = 3;

export interface StepRow {
  id: string;
  text: string;
}

interface StepInputProps {
  steps: StepRow[];
  onChange: (steps: StepRow[]) => void;
}

/** Counter for generating unique IDs */
let idCounter = 0;

/**
 * Generate a unique ID for step rows
 */
function generateId(): string {
  idCounter += 1;
  return `step-${idCounter}`;
}

/**
 * Create initial empty step
 */
export function createEmptySteps(): StepRow[] {
  return [{ id: generateId(), text: '' }];
}

/**
 * Dynamic step list input
 */
export function StepInput({ steps, onChange }: StepInputProps) {
  function handleChange(id: string, value: string) {
    const updated = steps.map((step) => (step.id === id ? { ...step, text: value } : step));
    onChange(updated);
  }

  function handleAdd() {
    onChange([...steps, { id: generateId(), text: '' }]);
  }

  function handleRemove(id: string) {
    if (steps.length <= 1) {
      return;
    }
    onChange(steps.filter((step) => step.id !== id));
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lavender-light text-sm font-semibold text-lavender">
            {index + 1}
          </div>
          <div className="flex-1">
            <textarea
              placeholder={`Step ${index + 1} instructions...`}
              value={step.text}
              onChange={(e) => handleChange(step.id, e.target.value)}
              rows={TEXTAREA_ROWS}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none focus:ring-1 focus:ring-lavender"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(step.id)}
            disabled={steps.length <= 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            aria-label={`Remove step ${index + 1}`}
          >
            <XIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-lavender hover:bg-lavender-light"
      >
        <PlusIcon />
        Add step
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
