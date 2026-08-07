/**
 * Navigation constants
 *
 * Configuration values for header and navigation behavior.
 * Keep HEADER_HEIGHT_PX aligned with --spacing-header in globals.css.
 */

import { HEADER_CONTENT_HEIGHT_PX } from '@/lib/design-system';

/** Height of the header content bar in pixels (excludes safe-area inset) */
export const HEADER_HEIGHT_PX = HEADER_CONTENT_HEIGHT_PX;

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
const Z_INDEX_COOKING_PANEL = 55;
const Z_INDEX_EDITOR_SAVE_BAR = 58;
const Z_INDEX_SEARCH_MODAL = 60;

/** Z-index values for navigation elements */
export const NAV_Z_INDEX = {
  header: Z_INDEX_HEADER,
  drawer: Z_INDEX_DRAWER,
  overlay: Z_INDEX_OVERLAY,
  cookingPanel: Z_INDEX_COOKING_PANEL,
  editorSaveBar: Z_INDEX_EDITOR_SAVE_BAR,
  searchModal: Z_INDEX_SEARCH_MODAL,
} as const;
