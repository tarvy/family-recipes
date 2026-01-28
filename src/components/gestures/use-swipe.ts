'use client';

/**
 * useSwipe Hook
 *
 * Detects horizontal swipe gestures on a touch element.
 */

import { type RefObject, type TouchEvent, useCallback, useRef } from 'react';
import { SWIPE_THRESHOLD_PX, SWIPE_VELOCITY_THRESHOLD } from '@/lib/constants/gestures';

export interface UseSwipeOptions {
  /** Callback when user swipes left */
  onSwipeLeft?: () => void;
  /** Callback when user swipes right */
  onSwipeRight?: () => void;
  /** Minimum distance to trigger swipe (default: 80px) */
  threshold?: number;
  /** Minimum velocity to trigger swipe (default: 0.5 px/ms) */
  velocityThreshold?: number;
  /** Called during swipe with current offset */
  onSwipeMove?: (offsetX: number) => void;
  /** Called when swipe ends without triggering action */
  onSwipeEnd?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  isHorizontal: boolean | null;
}

/**
 * Hook for detecting horizontal swipe gestures
 *
 * @param ref - Reference to the element to attach touch handlers to
 * @param options - Swipe configuration options
 */
export function useSwipe<T extends HTMLElement>(
  _ref: RefObject<T | null>,
  options: UseSwipeOptions,
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeMove,
    onSwipeEnd,
    threshold = SWIPE_THRESHOLD_PX,
    velocityThreshold = SWIPE_VELOCITY_THRESHOLD,
  } = options;

  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      isHorizontal: null,
    };
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!(touch && touchState.current)) {
        return;
      }

      const deltaX = touch.clientX - touchState.current.startX;
      const deltaY = touch.clientY - touchState.current.startY;

      // Determine direction on first significant movement
      if (touchState.current.isHorizontal === null) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Need at least 10px movement to determine direction
        if (absDeltaX > 10 || absDeltaY > 10) {
          touchState.current.isHorizontal = absDeltaX > absDeltaY;
        }
      }

      // If horizontal swipe, prevent vertical scrolling and track movement
      if (touchState.current.isHorizontal) {
        touchState.current.currentX = touch.clientX;
        onSwipeMove?.(deltaX);
      }
    },
    [onSwipeMove],
  );

  /**
   * Execute the appropriate swipe action based on direction
   */
  const executeSwipeAction = useCallback(
    (deltaX: number) => {
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else {
        onSwipeEnd?.();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeEnd],
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current) {
      return;
    }

    const { startX, startTime, currentX, isHorizontal } = touchState.current;
    touchState.current = null;

    if (!isHorizontal) {
      return;
    }

    const deltaX = currentX - startX;
    const duration = Date.now() - startTime;
    const velocity = Math.abs(deltaX) / duration;

    // Check if swipe meets threshold (distance or velocity)
    const meetsThreshold = Math.abs(deltaX) >= threshold || velocity >= velocityThreshold;

    if (meetsThreshold) {
      executeSwipeAction(deltaX);
    } else {
      onSwipeEnd?.();
    }
  }, [threshold, velocityThreshold, executeSwipeAction, onSwipeEnd]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
