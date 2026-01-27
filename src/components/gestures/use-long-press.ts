'use client';

/**
 * useLongPress Hook
 *
 * Detects long press/hold gestures for context menu activation.
 */

import { type MouseEvent, type TouchEvent, useCallback, useRef } from 'react';
import { LONG_PRESS_DURATION_MS, TAP_DISTANCE_PX } from '@/lib/constants/gestures';

export interface LongPressPosition {
  x: number;
  y: number;
}

export interface UseLongPressOptions {
  /** Callback when long press is detected */
  onLongPress: (position: LongPressPosition) => void;
  /** Duration to hold before triggering (default: 500ms) */
  duration?: number;
  /** Called when press starts */
  onPressStart?: () => void;
  /** Called when press is cancelled */
  onPressCancel?: () => void;
}

interface PressState {
  startX: number;
  startY: number;
  timeoutId: number;
}

/**
 * Hook for detecting long press gestures
 *
 * @param options - Long press configuration
 */
export function useLongPress(options: UseLongPressOptions) {
  const { onLongPress, onPressStart, onPressCancel, duration = LONG_PRESS_DURATION_MS } = options;

  const pressState = useRef<PressState | null>(null);

  const startPress = useCallback(
    (clientX: number, clientY: number) => {
      onPressStart?.();

      const timeoutId = window.setTimeout(() => {
        onLongPress({ x: clientX, y: clientY });
        pressState.current = null;
      }, duration);

      pressState.current = {
        startX: clientX,
        startY: clientY,
        timeoutId,
      };
    },
    [duration, onLongPress, onPressStart],
  );

  const cancelPress = useCallback(() => {
    if (pressState.current) {
      clearTimeout(pressState.current.timeoutId);
      pressState.current = null;
      onPressCancel?.();
    }
  }, [onPressCancel]);

  const checkMovement = useCallback(
    (clientX: number, clientY: number) => {
      if (!pressState.current) {
        return;
      }

      const deltaX = Math.abs(clientX - pressState.current.startX);
      const deltaY = Math.abs(clientY - pressState.current.startY);

      // Cancel if moved too far
      if (deltaX > TAP_DISTANCE_PX || deltaY > TAP_DISTANCE_PX) {
        cancelPress();
      }
    },
    [cancelPress],
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      startPress(touch.clientX, touch.clientY);
    },
    [startPress],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      checkMovement(touch.clientX, touch.clientY);
    },
    [checkMovement],
  );

  const handleTouchEnd = useCallback(() => {
    cancelPress();
  }, [cancelPress]);

  // Mouse handlers (for desktop right-click alternative)
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      // Only handle left-click for long press
      if (event.button !== 0) {
        return;
      }
      startPress(event.clientX, event.clientY);
    },
    [startPress],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      checkMovement(event.clientX, event.clientY);
    },
    [checkMovement],
  );

  const handleMouseUp = useCallback(() => {
    cancelPress();
  }, [cancelPress]);

  const handleMouseLeave = useCallback(() => {
    cancelPress();
  }, [cancelPress]);

  // Right-click handler for desktop
  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      onLongPress({ x: event.clientX, y: event.clientY });
    },
    [onLongPress],
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onContextMenu: handleContextMenu,
  };
}
