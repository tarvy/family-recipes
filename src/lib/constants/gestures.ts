/**
 * Gesture constants
 *
 * Threshold values for touch gesture detection.
 */

/** Minimum swipe distance to trigger action (px) */
export const SWIPE_THRESHOLD_PX = 80;

/** Minimum velocity to trigger swipe (px/ms) */
export const SWIPE_VELOCITY_THRESHOLD = 0.5;

/** Width of the edge zone for edge swipe detection (px) */
export const EDGE_ZONE_WIDTH_PX = 20;

/** Pull distance to trigger refresh (px) */
export const PTR_THRESHOLD_PX = 80;

/** Maximum pull distance for visual feedback (px) */
export const PTR_MAX_PULL_PX = 120;

/** Duration for long press detection (ms) */
export const LONG_PRESS_DURATION_MS = 500;

/** Minimum touch target size for accessibility (px) */
export const MIN_TOUCH_TARGET_SIZE_PX = 24;

/** Maximum time between touch start and end for a tap (ms) */
export const TAP_DURATION_MS = 200;

/** Maximum distance moved during a tap (px) */
export const TAP_DISTANCE_PX = 10;

/** Offset for pull-to-refresh indicator position (px) */
export const PTR_INDICATOR_OFFSET_PX = 40;

/** Full rotation angle for refresh arrow (degrees) */
export const PTR_ROTATION_DEGREES = 180;

/** Padding offset for context menu positioning (px) */
export const CONTEXT_MENU_PADDING_PX = 16;

/** Velocity multiplier for swipe momentum */
export const SWIPE_VELOCITY_MULTIPLIER = 1.5;

/** Divisor for calculating swipe midpoint */
export const SWIPE_MIDPOINT_DIVISOR = 2;

/** Resistance factor for pull gestures (0-1) */
export const PULL_RESISTANCE_FACTOR = 0.5;

/** Debounce threshold for swipe direction detection (px) */
export const SWIPE_DEBOUNCE_PX = 10;
