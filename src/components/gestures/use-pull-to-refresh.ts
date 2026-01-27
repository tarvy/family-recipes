'use client';

/**
 * usePullToRefresh Hook
 *
 * Detects pull-to-refresh gesture when at top of scrollable content.
 */

import { type RefObject, type TouchEvent, useCallback, useRef, useState } from 'react';
import { PTR_MAX_PULL_PX, PTR_THRESHOLD_PX } from '@/lib/constants/gestures';

export interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered (should return a promise) */
  onRefresh: () => Promise<void>;
  /** Pull distance to trigger refresh (default: 80px) */
  threshold?: number;
  /** Maximum visual pull distance (default: 120px) */
  maxPull?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

export interface PullToRefreshState {
  /** Current pull distance (0 when not pulling) */
  pullDistance: number;
  /** Whether refresh is currently in progress */
  isRefreshing: boolean;
  /** Whether user is actively pulling */
  isPulling: boolean;
}

interface TouchState {
  startY: number;
  currentY: number;
}

/**
 * Hook for pull-to-refresh functionality
 *
 * @param containerRef - Reference to the scrollable container
 * @param options - Pull-to-refresh configuration
 */
export function usePullToRefresh<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UsePullToRefreshOptions,
) {
  const {
    onRefresh,
    threshold = PTR_THRESHOLD_PX,
    maxPull = PTR_MAX_PULL_PX,
    enabled = true,
  } = options;

  const [state, setState] = useState<PullToRefreshState>({
    pullDistance: 0,
    isRefreshing: false,
    isPulling: false,
  });

  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      // Only start pull-to-refresh if at top of scroll
      const container = containerRef.current;
      if (container && container.scrollTop > 0) {
        return;
      }

      touchState.current = {
        startY: touch.clientY,
        currentY: touch.clientY,
      };

      setState((prev) => ({ ...prev, isPulling: true }));
    },
    [containerRef, enabled],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!(enabled && touchState.current) || state.isRefreshing) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaY = touch.clientY - touchState.current.startY;

      // Only allow pulling down, not up
      if (deltaY < 0) {
        touchState.current = null;
        setState((prev) => ({ ...prev, pullDistance: 0, isPulling: false }));
        return;
      }

      // Apply resistance as pull increases
      const resistance = 1 - Math.min(deltaY / maxPull, 1) * 0.5;
      const pullDistance = Math.min(deltaY * resistance, maxPull);

      touchState.current.currentY = touch.clientY;
      setState((prev) => ({ ...prev, pullDistance }));
    },
    [enabled, maxPull, state.isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!touchState.current || state.isRefreshing) {
      return;
    }

    const { pullDistance } = state;

    if (pullDistance >= threshold) {
      // Trigger refresh
      setState((prev) => ({ ...prev, isRefreshing: true, pullDistance: threshold }));

      try {
        await onRefresh();
      } finally {
        setState({ pullDistance: 0, isRefreshing: false, isPulling: false });
      }
    } else {
      // Reset without refresh
      setState({ pullDistance: 0, isRefreshing: false, isPulling: false });
    }

    touchState.current = null;
  }, [threshold, onRefresh, state.pullDistance, state.isRefreshing, state]);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
