/**
 * Cooking Session Types
 *
 * TypeScript interfaces for timer and pinned recipe state management.
 */

/** Timer extracted from Cooklang recipe step */
export interface TimerDefinition {
  duration: number;
  unit: string;
}

/** Parameters for starting a new timer */
export interface StartTimerParams {
  recipeSlug: string;
  recipeTitle: string;
  stepIndex: number;
  stepText: string;
  timer: TimerDefinition;
}

/** Runtime state of an active timer */
export interface ActiveTimer {
  /** Unique identifier for this timer instance */
  id: string;
  /** Recipe slug for navigation */
  recipeSlug: string;
  /** Recipe title for display */
  recipeTitle: string;
  /** Zero-indexed step number */
  stepIndex: number;
  /** First ~50 characters of step text */
  stepPreview: string;
  /** Original duration in milliseconds */
  originalDurationMs: number;
  /** Current remaining time in milliseconds */
  remainingMs: number;
  /** Timer status */
  status: 'running' | 'paused' | 'completed';
  /** Unix timestamp when timer was started */
  startedAt: number;
  /** Unix timestamp when timer was paused (null if running) */
  pausedAt: number | null;
  /** Human-readable label (e.g., "15 minutes") */
  label: string;
}

/** Pinned recipe for quick access */
export interface PinnedRecipe {
  slug: string;
  title: string;
  pinnedAt: number;
}

/** Shape of data persisted to localStorage */
export interface PersistedCookingSession {
  timers: ActiveTimer[];
  pinnedRecipes: PinnedRecipe[];
  soundEnabled: boolean;
}

/** Context value provided to consumers */
export interface CookingSessionContextValue {
  /** All active timers */
  activeTimers: ActiveTimer[];
  /** All pinned recipes */
  pinnedRecipes: PinnedRecipe[];

  /** Start a new timer from a recipe step */
  startTimer: (params: StartTimerParams) => string;
  /** Pause a running timer */
  pauseTimer: (timerId: string) => void;
  /** Resume a paused timer */
  resumeTimer: (timerId: string) => void;
  /** Cancel and remove a timer */
  cancelTimer: (timerId: string) => void;
  /** Dismiss a completed timer */
  dismissCompletedTimer: (timerId: string) => void;

  /** Pin a recipe for quick access */
  pinRecipe: (slug: string, title: string) => void;
  /** Remove a pinned recipe */
  unpinRecipe: (slug: string) => void;
  /** Check if a recipe is pinned */
  isPinned: (slug: string) => boolean;

  /** Whether the panel is expanded */
  isPanelExpanded: boolean;
  /** Toggle panel expand/collapse */
  togglePanel: () => void;

  /** Whether sound notifications are enabled */
  soundEnabled: boolean;
  /** Toggle sound on/off */
  toggleSound: () => void;

  /** Find an active timer for a specific step */
  findTimerForStep: (
    recipeSlug: string,
    stepIndex: number,
    timer: TimerDefinition,
  ) => ActiveTimer | undefined;

  /** Check if there is any content to show in the panel */
  hasContent: boolean;
}
