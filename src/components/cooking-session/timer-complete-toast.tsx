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

/** Vibration pattern for timer alarm: [vibrate, pause, vibrate, pause, vibrate] in ms */
const VIBRATE_PATTERN_MS = [200, 100, 200, 100, 200];

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

  // Play sound and vibrate on mount (when timer completes)
  useEffect(() => {
    // Vibration: works on mobile even when ringer is silent
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(VIBRATE_PATTERN_MS);
    }

    if (soundEnabled) {
      const playChime = async (): Promise<void> => {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextClass) {
            return;
          }

          const audioContext = new AudioContextClass();

          // Mobile browsers (iOS Safari, Chrome) start AudioContext suspended
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

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
      };
      playChime().catch(() => {
        /* Audio not supported, fail silently */
      });
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
      className="fixed bottom-20 left-4 right-4 mx-auto max-w-md animate-in slide-in-from-bottom-4 rounded-lg bg-success-soft p-4 shadow-lg ring-1 ring-success/30"
      style={{ zIndex: NAV_Z_INDEX.cookingPanel + 1 }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-success">
          <CheckIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-success">Timer Complete!</p>
          <p className="text-sm text-foreground">
            {timer.recipeTitle} - Step {timer.stepIndex + 1}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{timer.stepPreview}</p>
        </div>
        <button
          type="button"
          onClick={() => dismissCompletedTimer(timer.id)}
          className="flex size-touch flex-shrink-0 items-center justify-center rounded-full text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success"
          aria-label="Dismiss notification"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
