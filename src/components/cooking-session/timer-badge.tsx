'use client';

/**
 * Timer Badge Component
 *
 * Clickable badge for starting timers from recipe steps.
 * Shows countdown when timer is active.
 */

import type { ReactNode } from 'react';
import { useCookingSession } from './cooking-session-context';
import type { TimerDefinition } from './types';

interface TimerBadgeProps {
  timer: TimerDefinition;
  recipeSlug: string;
  recipeTitle: string;
  stepIndex: number;
  stepText: string;
}

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/** Seconds per minute */
const SECONDS_PER_MINUTE = 60;

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/** Padding width for time display formatting (MM:SS) */
const TIME_PAD_WIDTH = 2;

/**
 * Format milliseconds as MM:SS
 */
function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes.toString().padStart(TIME_PAD_WIDTH, '0')}:${seconds.toString().padStart(TIME_PAD_WIDTH, '0')}`;
}

/**
 * Format timer for static display
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
 * Clock icon
 */
function ClockIcon(): ReactNode {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={ICON_STROKE_WIDTH} />
      <path strokeLinecap="round" strokeWidth={ICON_STROKE_WIDTH} d="M12 6v6l4 2" />
    </svg>
  );
}

/**
 * Clickable timer badge that starts a countdown when clicked
 */
export function TimerBadge({
  timer,
  recipeSlug,
  recipeTitle,
  stepIndex,
  stepText,
}: TimerBadgeProps): ReactNode {
  const { startTimer, findTimerForStep, pauseTimer, resumeTimer } = useCookingSession();

  const activeTimer = findTimerForStep(recipeSlug, stepIndex, timer);
  const isActive = Boolean(activeTimer);
  const isRunning = activeTimer?.status === 'running';
  const isPaused = activeTimer?.status === 'paused';
  const isCompleted = activeTimer?.status === 'completed';

  const handleClick = () => {
    if (!activeTimer) {
      // Start new timer
      startTimer({
        recipeSlug,
        recipeTitle,
        stepIndex,
        stepText,
        timer,
      });
    } else if (isRunning) {
      // Pause running timer
      pauseTimer(activeTimer.id);
    } else if (isPaused) {
      // Resume paused timer
      resumeTimer(activeTimer.id);
    }
    // If completed, clicking does nothing (user should dismiss from panel)
  };

  const displayText =
    isActive && activeTimer
      ? formatTimeRemaining(activeTimer.remainingMs)
      : formatTimerLabel(timer.duration, timer.unit);

  const ariaLabel = isActive
    ? `Timer: ${displayText} remaining. ${isRunning ? 'Click to pause' : isPaused ? 'Click to resume' : 'Completed'}`
    : `Start ${formatTimerLabel(timer.duration, timer.unit)} timer`;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCompleted}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-pink focus:ring-offset-1 ${
        isCompleted
          ? 'cursor-default bg-green-100 text-green-800'
          : isRunning
            ? 'animate-pulse cursor-pointer bg-yellow text-foreground hover:bg-yellow/80'
            : isPaused
              ? 'cursor-pointer bg-muted text-muted-foreground hover:bg-muted/80'
              : 'cursor-pointer bg-yellow text-foreground hover:bg-yellow/80'
      }`}
      aria-label={ariaLabel}
    >
      <ClockIcon />
      {displayText}
    </button>
  );
}
