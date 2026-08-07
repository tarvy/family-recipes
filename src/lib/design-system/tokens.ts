/**
 * Design system tokens (TypeScript mirror of globals.css @theme).
 *
 * CSS custom properties in src/app/globals.css remain the runtime source of
 * truth for colors/radius/shadows. Use these constants for layout math,
 * touch targets, and documentation-aligned defaults in components.
 */

/** Minimum touch target size (iOS HIG-aligned for the web PWA) */
export const TOUCH_TARGET_MIN_PX = 44;

/** Header content height excluding safe-area inset */
export const HEADER_CONTENT_HEIGHT_PX = 56;

/** Mobile navigation drawer width */
export const DRAWER_WIDTH_PX = 280;

/** Breakpoint where inline header nav replaces the hamburger drawer */
export const MOBILE_NAV_BREAKPOINT_PX = 768;

/** Canonical brand hex values (keep in sync with globals.css) */
export const brandColors = {
  pink: '#FED4D9',
  pinkDark: '#F5B8C0',
  pinkLight: '#FFF0F2',
  yellow: '#EFEBBA',
  yellowDark: '#E5DF8A',
  yellowLight: '#F9F8E6',
  lavender: '#AF93B3',
  lavenderDark: '#937598',
  lavenderLight: '#D4C6D6',
  gingham: '#FBF6E3',
  cream: '#FFFEF9',
  cocoa: '#4A3728',
  success: '#5B8F6B',
  successSoft: '#E8F2EB',
  destructive: '#E57373',
  border: '#E8E4DC',
  muted: '#F5F3EE',
  mutedForeground: '#7A6B5C',
} as const;

export type BrandColor = keyof typeof brandColors;

/** Page content max-width presets used across routes */
export const contentMaxWidth = {
  auth: 'max-w-md',
  reading: 'max-w-3xl',
  detail: 'max-w-5xl',
  browse: 'max-w-6xl',
} as const;

export type ContentMaxWidth = keyof typeof contentMaxWidth;
