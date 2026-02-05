/**
 * Date formatting utilities
 *
 * Provides locale-aware date formatting for display in the UI.
 */

/** Locale for date formatting */
const DATE_LOCALE = 'en-US';

/** Options for formatting updated dates */
const UPDATED_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

/**
 * Format an ISO date string for "Updated" display.
 *
 * @param isoString - ISO 8601 date string (e.g., "2026-01-05T12:00:00.000Z")
 * @returns Formatted string like "Jan 5, 2026"
 */
export function formatUpdatedDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(DATE_LOCALE, UPDATED_DATE_OPTIONS);
}
