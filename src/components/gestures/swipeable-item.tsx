'use client';

/**
 * SwipeableItem Component
 *
 * Wraps a list item to add swipe-to-action functionality.
 * Reveals action backgrounds when swiping.
 */

import { type ReactNode, useCallback, useRef, useState } from 'react';
import {
  SWIPE_MIDPOINT_DIVISOR,
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_MULTIPLIER,
} from '@/lib/constants/gestures';
import { useSwipe } from './use-swipe';

/** Icon stroke width for action icons */
const ICON_STROKE_WIDTH = 2;

export interface SwipeAction {
  /** Action identifier */
  id: string;
  /** Background color class */
  bgColor: string;
  /** Icon to display */
  icon: ReactNode;
  /** Label for accessibility */
  label: string;
}

export interface SwipeableItemProps {
  /** Content to display in the item */
  children: ReactNode;
  /** Action to show on swipe left */
  leftAction?: SwipeAction;
  /** Action to show on swipe right */
  rightAction?: SwipeAction;
  /** Callback when left action is triggered */
  onSwipeLeft?: () => void;
  /** Callback when right action is triggered */
  onSwipeRight?: () => void;
  /** Whether swipe is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
}

/**
 * Swipeable list item component
 */
export function SwipeableItem({
  children,
  leftAction,
  rightAction,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = '',
}: SwipeableItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSwipeMove = useCallback((offset: number) => {
    // Limit swipe distance
    const maxOffset = SWIPE_THRESHOLD_PX * SWIPE_VELOCITY_MULTIPLIER;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
    setOffsetX(clampedOffset);
  }, []);

  const handleSwipeEnd = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  const handleSwipeLeft = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    setTimeout(() => setIsAnimating(false), 300);
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    setTimeout(() => setIsAnimating(false), 300);
    onSwipeRight?.();
  }, [onSwipeRight]);

  // Build options conditionally to satisfy exactOptionalPropertyTypes
  const swipeOptions: Parameters<typeof useSwipe>[1] = {
    onSwipeMove: handleSwipeMove,
    onSwipeEnd: handleSwipeEnd,
  };
  if (leftAction) {
    swipeOptions.onSwipeLeft = handleSwipeLeft;
  }
  if (rightAction) {
    swipeOptions.onSwipeRight = handleSwipeRight;
  }

  const swipeHandlers = useSwipe(containerRef, swipeOptions);

  // Don't apply swipe handlers if disabled
  const touchHandlers = disabled ? {} : swipeHandlers;

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} {...touchHandlers}>
      {/* Left action background (revealed on swipe right) */}
      {rightAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 ${rightAction.bgColor}`}
          style={{ width: Math.abs(Math.max(0, offsetX)) }}
          aria-hidden="true"
        >
          {offsetX > SWIPE_THRESHOLD_PX / SWIPE_MIDPOINT_DIVISOR && (
            <span className="text-white">{rightAction.icon}</span>
          )}
        </div>
      )}

      {/* Right action background (revealed on swipe left) */}
      {leftAction && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 ${leftAction.bgColor}`}
          style={{ width: Math.abs(Math.min(0, offsetX)) }}
          aria-hidden="true"
        >
          {offsetX < -SWIPE_THRESHOLD_PX / SWIPE_MIDPOINT_DIVISOR && (
            <span className="text-white">{leftAction.icon}</span>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="relative bg-card"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isAnimating ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Check icon for swipe-to-check action
 */
export function SwipeCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-6 w-6'}
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
 * Trash icon for swipe-to-delete action
 */
export function SwipeDeleteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-6 w-6'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
