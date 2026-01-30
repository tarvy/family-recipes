/**
 * Error utility functions for consistent error handling across the codebase.
 *
 * These helpers reduce cognitive complexity by extracting ternary operations
 * that are commonly used in catch blocks.
 */

/**
 * Extract Error from unknown, or undefined if not an Error.
 * Use for passing to logger functions that expect Error | undefined.
 */
export function toError(error: unknown): Error | undefined {
  return error instanceof Error ? error : undefined;
}

/**
 * Extract error message from unknown, or 'unknown' if not an Error.
 * Use for span attributes and error message strings.
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}
