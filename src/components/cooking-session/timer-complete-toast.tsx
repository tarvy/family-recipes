'use client';

/**
 * Timer Complete Toast Component
 *
 * Notification displayed when a timer completes.
 */

import { type ReactNode, useEffect } from 'react';
import { NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useCookingSession } from './cooking-session-context';
import type { ActiveTimer } from './types';

interface TimerCompleteToastProps {
  timer: ActiveTimer;
}

/** Auto-dismiss delay in milliseconds */
const AUTO_DISMISS_MS = 30000;

/** Audio frequency for notification chime (A5 note) */
const CHIME_FREQUENCY_HZ = 880;

/** Chime volume level (0-1) */
const CHIME_VOLUME = 0.3;

/** Chime duration in seconds */
const CHIME_DURATION_S = 0.5;

/** Gain value for fade-out end */
const CHIME_FADE_END = 0.01;

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/**
 * Check icon
 */
function CheckIcon(): ReactNode {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * X icon
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
 * Toast notification for completed timer
 */
export function TimerCompleteToast({ timer }: TimerCompleteToastProps): ReactNode {
  const { dismissCompletedTimer, soundEnabled } = useCookingSession();

  // Play sound on mount
  useEffect(() => {
    if (soundEnabled) {
      // Use Web Audio API for a simple chime
      try {
        const audioContext = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(CHIME_FREQUENCY_HZ, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(CHIME_VOLUME, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          CHIME_FADE_END,
          audioContext.currentTime + CHIME_DURATION_S,
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + CHIME_DURATION_S);
      } catch {
        // Audio not supported, fail silently
      }
    }
  }, [soundEnabled]);

  // Auto-dismiss
  useEffect(() => {
    const timeout = setTimeout(() => {
      dismissCompletedTimer(timer.id);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timeout);
  }, [timer.id, dismissCompletedTimer]);

  return (
    <div
      className="fixed bottom-20 left-4 right-4 mx-auto max-w-md animate-in slide-in-from-bottom-4 rounded-lg bg-green-50 p-4 shadow-lg ring-1 ring-green-200"
      style={{ zIndex: NAV_Z_INDEX.cookingPanel + 1 }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-green-600">
          <CheckIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-green-800">Timer Complete!</p>
          <p className="text-sm text-green-700">
            {timer.recipeTitle} - Step {timer.stepIndex + 1}
          </p>
          <p className="mt-1 text-xs text-green-600">{timer.stepPreview}</p>
        </div>
        <button
          type="button"
          onClick={() => dismissCompletedTimer(timer.id)}
          className="flex-shrink-0 rounded-full p-1 text-green-600 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Dismiss notification"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
