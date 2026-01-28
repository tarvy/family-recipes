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

/** Z-index base values */
const Z_INDEX_HEADER = 40;
const Z_INDEX_OVERLAY = 45;
const Z_INDEX_DRAWER = 50;
const Z_INDEX_SEARCH_MODAL = 60;

/** Z-index values for navigation elements */
export const NAV_Z_INDEX = {
  header: Z_INDEX_HEADER,
  drawer: Z_INDEX_DRAWER,
  overlay: Z_INDEX_OVERLAY,
  searchModal: Z_INDEX_SEARCH_MODAL,
} as const;
