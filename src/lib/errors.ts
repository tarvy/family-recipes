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

const MONGO_DUPLICATE_KEY_CODE = 11000;

/**
 * True when a MongoDB write failed on a unique index (E11000).
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === MONGO_DUPLICATE_KEY_CODE
  );
}
