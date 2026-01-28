'use client';

/**
 * useEdgeSwipe Hook
 *
 * Detects swipe gestures starting from the left edge of the screen.
 * Used to open the navigation drawer.
 */

import { useCallback, useEffect, useRef } from 'react';
import { EDGE_ZONE_WIDTH_PX, SWIPE_THRESHOLD_PX } from '@/lib/constants/gestures';

export interface UseEdgeSwipeOptions {
  /** Callback when edge swipe is detected */
  onSwipe: () => void;
  /** Width of the edge zone in pixels (default: 20px) */
  edgeWidth?: number;
  /** Minimum swipe distance (default: 80px) */
  threshold?: number;
  /** Whether edge swipe is enabled (default: true) */
  enabled?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  isEdgeSwipe: boolean;
}

/**
 * Hook for detecting swipes from the left edge of the screen
 *
 * @param options - Edge swipe configuration
 */
export function useEdgeSwipe(options: UseEdgeSwipeOptions) {
  const {
    onSwipe,
    edgeWidth = EDGE_ZONE_WIDTH_PX,
    threshold = SWIPE_THRESHOLD_PX,
    enabled = true,
  } = options;

  const swipeState = useRef<SwipeState | null>(null);

  const handleTouchStart = useCallback(
    (event: globalThis.TouchEvent) => {
      if (!enabled) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      // Check if touch started in the edge zone
      const isEdgeSwipe = touch.clientX <= edgeWidth;

      swipeState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        isEdgeSwipe,
      };
    },
    [enabled, edgeWidth],
  );

  const handleTouchMove = useCallback(
    (event: globalThis.TouchEvent) => {
      if (!swipeState.current?.isEdgeSwipe) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - swipeState.current.startX;
      const deltaY = Math.abs(touch.clientY - swipeState.current.startY);

      // Must be more horizontal than vertical
      if (deltaX > 0 && deltaX > deltaY) {
        // Check if threshold is met
        if (deltaX >= threshold) {
          onSwipe();
          swipeState.current = null;
        }
      } else if (deltaY > deltaX) {
        // Cancel if moving more vertically
        swipeState.current = null;
      }
    },
    [threshold, onSwipe],
  );

  const handleTouchEnd = useCallback(() => {
    swipeState.current = null;
  }, []);

  // Attach listeners to document for edge detection
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
