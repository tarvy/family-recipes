'use client';

/**
 * PullToRefreshContainer Component
 *
 * Wraps scrollable content to add pull-to-refresh functionality.
 */

import { type ReactNode, useRef } from 'react';
import {
  PTR_INDICATOR_OFFSET_PX,
  PTR_ROTATION_DEGREES,
  PTR_THRESHOLD_PX,
} from '@/lib/constants/gestures';
import { usePullToRefresh } from './use-pull-to-refresh';

/** Icon stroke width for spinner */
const ICON_STROKE_WIDTH = 2;

export interface PullToRefreshContainerProps {
  /** Content to display */
  children: ReactNode;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Additional class name for the container */
  className?: string;
}

/**
 * Container with pull-to-refresh functionality
 */
export function PullToRefreshContainer({
  children,
  onRefresh,
  enabled = true,
  className = '',
}: PullToRefreshContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { pullDistance, isRefreshing, isPulling, handlers } = usePullToRefresh(containerRef, {
    onRefresh,
    enabled,
  });

  // Calculate progress for visual feedback
  const progress = Math.min(pullDistance / PTR_THRESHOLD_PX, 1);
  const showIndicator = isPulling || isRefreshing;

  return (
    <div ref={containerRef} className={`relative ${className}`} {...handlers}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="pointer-events-none absolute left-0 right-0 flex justify-center"
          style={{
            top: pullDistance - PTR_INDICATOR_OFFSET_PX,
            opacity: progress,
            transition: isRefreshing ? 'none' : 'opacity 0.2s ease-out',
          }}
        >
          <div className="rounded-full bg-card p-2 shadow-md">
            {isRefreshing ? (
              <RefreshSpinner className="h-6 w-6 text-lavender" />
            ) : (
              <RefreshArrow
                className="h-6 w-6 text-lavender"
                style={{
                  transform: `rotate(${progress * PTR_ROTATION_DEGREES}deg)`,
                  transition: 'transform 0.1s ease-out',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Content with pull offset */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Refresh arrow icon
 */
function RefreshArrow({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}

/**
 * Spinning refresh icon
 */
function RefreshSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
