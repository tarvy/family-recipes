'use client';

/**
 * Cooking Session Panel
 *
 * Fixed bottom panel showing active timers and pinned recipes.
 * Collapsible with expand/collapse toggle.
 */

import type { ReactNode } from 'react';

/** SVG icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

import { NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useCookingSession } from './cooking-session-context';
import { PinnedRecipeItem } from './pinned-recipe-item';
import { TimerCompleteToast } from './timer-complete-toast';
import { TimerItem } from './timer-item';

/**
 * Chevron up icon
 */
function ChevronUpIcon(): ReactNode {
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
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

/**
 * Chevron down icon
 */
function ChevronDownIcon(): ReactNode {
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

/**
 * Speaker icon (sound on)
 */
function SpeakerOnIcon(): ReactNode {
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
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}

/**
 * Speaker icon (sound off)
 */
function SpeakerOffIcon(): ReactNode {
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
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
      />
    </svg>
  );
}

/**
 * Fixed bottom panel for cooking session
 */
export function CookingSessionPanel(): ReactNode {
  const {
    activeTimers,
    pinnedRecipes,
    isPanelExpanded,
    togglePanel,
    soundEnabled,
    toggleSound,
    hasContent,
  } = useCookingSession();

  // Find completed timers for toasts
  const completedTimers = activeTimers.filter((t) => t.status === 'completed');
  const runningOrPausedTimers = activeTimers.filter((t) => t.status !== 'completed');

  if (!hasContent) {
    return null;
  }

  const timerCount = activeTimers.length;
  const pinnedCount = pinnedRecipes.length;

  return (
    <>
      {/* Completion toasts */}
      {completedTimers.map((timer) => (
        <TimerCompleteToast key={timer.id} timer={timer} />
      ))}

      {/* Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background shadow-lg ring-1 ring-border"
        style={{ zIndex: NAV_Z_INDEX.cookingPanel }}
      >
        {/* Header - always visible */}
        <div className="flex w-full items-center justify-between px-4 py-3">
          {/* Toggle area - clickable to expand/collapse */}
          <button
            type="button"
            onClick={togglePanel}
            className="flex flex-1 items-center gap-3 hover:text-pink focus:outline-none focus:ring-2 focus:ring-pink focus:ring-offset-1 rounded"
            aria-expanded={isPanelExpanded}
            aria-controls="cooking-session-content"
          >
            <span className="font-medium text-foreground">
              {timerCount > 0 && `${timerCount} Timer${timerCount !== 1 ? 's' : ''}`}
              {timerCount > 0 && pinnedCount > 0 && ' | '}
              {pinnedCount > 0 && `${pinnedCount} Pinned`}
            </span>
            {/* Expand/collapse indicator */}
            <span className="text-muted-foreground">
              {isPanelExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
            </span>
          </button>

          {/* Sound toggle - separate button */}
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-pink"
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
          </button>
        </div>

        {/* Expandable content */}
        {isPanelExpanded && (
          <div
            id="cooking-session-content"
            className="max-h-80 overflow-y-auto border-t border-border px-4 pb-4"
          >
            {/* Timers section */}
            {runningOrPausedTimers.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Timers
                </h3>
                <div className="space-y-2">
                  {runningOrPausedTimers.map((timer) => (
                    <TimerItem key={timer.id} timer={timer} />
                  ))}
                </div>
              </div>
            )}

            {/* Pinned recipes section */}
            {pinnedRecipes.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pinned Recipes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {pinnedRecipes.map((recipe) => (
                    <PinnedRecipeItem key={recipe.slug} recipe={recipe} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
