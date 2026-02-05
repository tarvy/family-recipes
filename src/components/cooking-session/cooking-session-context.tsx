'use client';

/**
 * Cooking Session Context
 *
 * Provides timer and pinned recipe state management with localStorage persistence.
 * Follows patterns from NavigationProvider and ShoppingListClient.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ActiveTimer,
  CookingSessionContextValue,
  PersistedCookingSession,
  PinnedRecipe,
  StartTimerParams,
  TimerDefinition,
} from './types';

/** localStorage key for persisting cooking session */
const STORAGE_KEY = 'family-recipes-cooking-session';

/** Interval for updating timer countdowns (ms) */
const TICK_INTERVAL_MS = 1000;

/** Maximum length for step preview text */
const STEP_PREVIEW_MAX_LENGTH = 50;

/** Substring start index for random ID generation */
const RANDOM_ID_SLICE_START = 2;

/** Substring end index for random ID generation */
const RANDOM_ID_SLICE_END = 9;

/** Base for generating random alphanumeric strings */
const RANDOM_STRING_BASE = 36;

/** Length of ellipsis suffix for truncation */
const ELLIPSIS_LENGTH = 3;

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/** Milliseconds per minute */
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Milliseconds per hour */
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const CookingSessionContext = createContext<CookingSessionContextValue | null>(null);

interface CookingSessionProviderProps {
  children: ReactNode;
}

/**
 * Convert timer duration and unit to milliseconds
 */
function timerToMs(duration: number, unit: string): number {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.startsWith('sec')) {
    return duration * MS_PER_SECOND;
  }

  if (normalizedUnit.startsWith('min')) {
    return duration * MS_PER_MINUTE;
  }

  if (normalizedUnit.startsWith('hour') || normalizedUnit === 'hr' || normalizedUnit === 'hrs') {
    return duration * MS_PER_HOUR;
  }

  // Default to minutes if unknown unit
  return duration * MS_PER_MINUTE;
}

/**
 * Format timer duration for display label
 */
function formatTimerLabel(duration: number, unit: string): string {
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
 * Generate unique timer ID
 */
function generateTimerId(): string {
  return `timer-${Date.now()}-${Math.random().toString(RANDOM_STRING_BASE).slice(RANDOM_ID_SLICE_START, RANDOM_ID_SLICE_END)}`;
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - ELLIPSIS_LENGTH)}...`;
}

/**
 * Cooking session provider with timer countdown and localStorage persistence
 */
export function CookingSessionProvider({ children }: CookingSessionProviderProps) {
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [pinnedRecipes, setPinnedRecipes] = useState<PinnedRecipe[]>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PersistedCookingSession;

        // Recalculate remaining time for running timers based on elapsed time
        const now = Date.now();
        const restoredTimers = (parsed.timers ?? []).map((timer) => {
          if (timer.status === 'running') {
            const elapsedSinceStart = now - timer.startedAt;
            const newRemaining = timer.originalDurationMs - elapsedSinceStart;
            return {
              ...timer,
              remainingMs: Math.max(0, newRemaining),
              status: newRemaining <= 0 ? ('completed' as const) : ('running' as const),
            };
          }
          return timer;
        });

        setActiveTimers(restoredTimers);
        setPinnedRecipes(parsed.pinnedRecipes ?? []);
        setSoundEnabled(parsed.soundEnabled ?? true);
      } catch {
        // Invalid stored data, start fresh
      }
    }
    setIsHydrated(true);
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const state: PersistedCookingSession = {
      timers: activeTimers,
      pinnedRecipes,
      soundEnabled,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [activeTimers, pinnedRecipes, soundEnabled, isHydrated]);

  // Timer countdown interval
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const hasRunningTimers = activeTimers.some((t) => t.status === 'running');

    if (!hasRunningTimers) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((timer) => {
          if (timer.status !== 'running') {
            return timer;
          }

          const newRemaining = timer.remainingMs - TICK_INTERVAL_MS;

          if (newRemaining <= 0) {
            return {
              ...timer,
              remainingMs: 0,
              status: 'completed' as const,
            };
          }

          return {
            ...timer,
            remainingMs: newRemaining,
          };
        }),
      );
    }, TICK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHydrated, activeTimers]);

  // Timer actions
  const startTimer = useCallback((params: StartTimerParams): string => {
    const id = generateTimerId();
    const durationMs = timerToMs(params.timer.duration, params.timer.unit);

    const newTimer: ActiveTimer = {
      id,
      recipeSlug: params.recipeSlug,
      recipeTitle: params.recipeTitle,
      stepIndex: params.stepIndex,
      stepPreview: truncateText(params.stepText, STEP_PREVIEW_MAX_LENGTH),
      originalDurationMs: durationMs,
      remainingMs: durationMs,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
      label: formatTimerLabel(params.timer.duration, params.timer.unit),
    };

    setActiveTimers((prev) => [...prev, newTimer]);
    setIsPanelExpanded(true);

    return id;
  }, []);

  const pauseTimer = useCallback((timerId: string) => {
    setActiveTimers((prev) =>
      prev.map((timer) =>
        timer.id === timerId && timer.status === 'running'
          ? { ...timer, status: 'paused' as const, pausedAt: Date.now() }
          : timer,
      ),
    );
  }, []);

  const resumeTimer = useCallback((timerId: string) => {
    setActiveTimers((prev) =>
      prev.map((timer) =>
        timer.id === timerId && timer.status === 'paused'
          ? {
              ...timer,
              status: 'running' as const,
              pausedAt: null,
              startedAt: Date.now() - (timer.originalDurationMs - timer.remainingMs),
            }
          : timer,
      ),
    );
  }, []);

  const cancelTimer = useCallback((timerId: string) => {
    setActiveTimers((prev) => prev.filter((timer) => timer.id !== timerId));
  }, []);

  const dismissCompletedTimer = useCallback((timerId: string) => {
    setActiveTimers((prev) => prev.filter((timer) => timer.id !== timerId));
  }, []);

  // Pin actions
  const pinRecipe = useCallback((slug: string, title: string) => {
    setPinnedRecipes((prev) => {
      if (prev.some((p) => p.slug === slug)) {
        return prev;
      }
      return [...prev, { slug, title, pinnedAt: Date.now() }];
    });
    setIsPanelExpanded(true);
  }, []);

  const unpinRecipe = useCallback((slug: string) => {
    setPinnedRecipes((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  const isPinned = useCallback(
    (slug: string) => pinnedRecipes.some((p) => p.slug === slug),
    [pinnedRecipes],
  );

  // Panel toggle
  const togglePanel = useCallback(() => {
    setIsPanelExpanded((prev) => !prev);
  }, []);

  // Sound toggle
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  // Find timer for a specific step (to check if already active)
  const findTimerForStep = useCallback(
    (recipeSlug: string, stepIndex: number, timer: TimerDefinition): ActiveTimer | undefined => {
      return activeTimers.find((t) => {
        // Match by recipe, step, and original duration
        return (
          t.recipeSlug === recipeSlug &&
          t.stepIndex === stepIndex &&
          t.originalDurationMs === timerToMs(timer.duration, timer.unit)
        );
      });
    },
    [activeTimers],
  );

  const hasContent = activeTimers.length > 0 || pinnedRecipes.length > 0;

  const value = useMemo<CookingSessionContextValue>(
    () => ({
      activeTimers,
      pinnedRecipes,
      startTimer,
      pauseTimer,
      resumeTimer,
      cancelTimer,
      dismissCompletedTimer,
      pinRecipe,
      unpinRecipe,
      isPinned,
      isPanelExpanded,
      togglePanel,
      soundEnabled,
      toggleSound,
      findTimerForStep,
      hasContent,
    }),
    [
      activeTimers,
      pinnedRecipes,
      startTimer,
      pauseTimer,
      resumeTimer,
      cancelTimer,
      dismissCompletedTimer,
      pinRecipe,
      unpinRecipe,
      isPinned,
      isPanelExpanded,
      togglePanel,
      soundEnabled,
      toggleSound,
      findTimerForStep,
      hasContent,
    ],
  );

  return <CookingSessionContext.Provider value={value}>{children}</CookingSessionContext.Provider>;
}

/**
 * Default context value for when provider is not available.
 *
 * This allows components to render safely during streaming/suspense
 * before the provider has hydrated. All actions are no-ops.
 */
const DEFAULT_CONTEXT_VALUE: CookingSessionContextValue = {
  activeTimers: [],
  pinnedRecipes: [],
  startTimer: () => '',
  pauseTimer: () => {},
  resumeTimer: () => {},
  cancelTimer: () => {},
  dismissCompletedTimer: () => {},
  pinRecipe: () => {},
  unpinRecipe: () => {},
  isPinned: () => false,
  isPanelExpanded: false,
  togglePanel: () => {},
  soundEnabled: true,
  toggleSound: () => {},
  findTimerForStep: () => undefined,
  hasContent: false,
};

/**
 * Hook to access cooking session context.
 *
 * Returns a default no-op value if called outside the provider,
 * which allows components to render safely during streaming/suspense.
 */
export function useCookingSession(): CookingSessionContextValue {
  const context = useContext(CookingSessionContext);
  // Return default value if context is not available (streaming/suspense safety)
  return context ?? DEFAULT_CONTEXT_VALUE;
}
