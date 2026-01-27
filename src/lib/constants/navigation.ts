/**
 * Navigation constants
 *
 * Configuration values for header and navigation behavior.
 */

/** Height of the header bar in pixels */
export const HEADER_HEIGHT_PX = 56;

/** Minimum scroll distance before triggering fold/unfold */
export const SCROLL_THRESHOLD_PX = 10;

/** Scroll distance before header fully collapses */
export const HEADER_FOLD_THRESHOLD_PX = 100;

/** Breakpoint for mobile navigation (hamburger menu) */
export const MOBILE_NAV_BREAKPOINT_PX = 768;

/** Z-index values for navigation elements */
export const NAV_Z_INDEX = {
  header: 40,
  drawer: 50,
  overlay: 45,
  searchModal: 60,
} as const;
