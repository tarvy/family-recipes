'use client';

/**
 * Timer Item Component
 *
 * Displays a single active timer with controls for pause/resume and cancel.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCookingSession } from './cooking-session-context';
import type { ActiveTimer } from './types';

interface TimerItemProps {
  timer: ActiveTimer;
}

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/** Seconds per minute */
const SECONDS_PER_MINUTE = 60;

/** Threshold in milliseconds for displaying remaining time in red */
const LOW_TIME_THRESHOLD_MS = 60000;

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
 * Get container class based on timer status
 */
function getContainerClass(status: ActiveTimer['status']): string {
  if (status === 'completed') {
    return 'bg-green-50 ring-1 ring-green-200';
  }
  if (status === 'paused') {
    return 'bg-muted/50';
  }
  return 'bg-card ring-1 ring-border';
}

/**
 * Get icon color class based on timer status
 */
function getIconColorClass(status: ActiveTimer['status']): string {
  if (status === 'completed') {
    return 'text-green-600';
  }
  if (status === 'paused') {
    return 'text-muted-foreground';
  }
  return 'text-yellow-600';
}

/**
 * Get time display color class based on timer status and remaining time
 */
function getTimeColorClass(status: ActiveTimer['status'], remainingMs: number): string {
  if (status === 'completed') {
    return 'text-green-600';
  }
  if (status === 'paused') {
    return 'text-muted-foreground';
  }
  if (remainingMs <= LOW_TIME_THRESHOLD_MS) {
    return 'text-red-600';
  }
  return 'text-foreground';
}

/**
 * Pause icon
 */
function PauseIcon(): ReactNode {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

/**
 * Play icon
 */
function PlayIcon(): ReactNode {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * X icon for cancel
 */
function XIcon(): ReactNode {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Clock icon
 */
function ClockIcon(): ReactNode {
  return (
    <svg
      className="h-4 w-4"
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
 * Single timer row with recipe info, time, and controls
 */
export function TimerItem({ timer }: TimerItemProps): ReactNode {
  const { pauseTimer, resumeTimer, cancelTimer, dismissCompletedTimer } = useCookingSession();

  const isRunning = timer.status === 'running';
  const isPaused = timer.status === 'paused';
  const isCompleted = timer.status === 'completed';

  const handlePauseResume = () => {
    if (isRunning) {
      pauseTimer(timer.id);
    } else if (isPaused) {
      resumeTimer(timer.id);
    }
  };

  const handleCancel = () => {
    if (isCompleted) {
      dismissCompletedTimer(timer.id);
    } else {
      cancelTimer(timer.id);
    }
  };

  const containerClass = getContainerClass(timer.status);
  const iconColorClass = getIconColorClass(timer.status);
  const timeColorClass = getTimeColorClass(timer.status, timer.remainingMs);

  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 ${containerClass}`}>
      {/* Timer icon */}
      <div className={`flex-shrink-0 ${iconColorClass}`}>
        <ClockIcon />
      </div>

      {/* Timer info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/recipes/${timer.recipeSlug}`}
          className="block truncate font-medium text-foreground hover:text-pink hover:underline"
        >
          {timer.recipeTitle}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          Step {timer.stepIndex + 1}: {timer.stepPreview}
        </p>
      </div>

      {/* Time remaining */}
      <div className={`flex-shrink-0 font-mono text-lg font-semibold ${timeColorClass}`}>
        {isCompleted ? 'Done!' : formatTimeRemaining(timer.remainingMs)}
      </div>

      {/* Controls */}
      <div className="flex flex-shrink-0 gap-1">
        {!isCompleted && (
          <button
            type="button"
            onClick={handlePauseResume}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-pink"
            aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? <PauseIcon /> : <PlayIcon />}
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive focus:outline-none focus:ring-2 focus:ring-pink"
          aria-label={isCompleted ? 'Dismiss timer' : 'Cancel timer'}
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
