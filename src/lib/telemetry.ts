/**
 * Telemetry helpers for tracing operations
 *
 * OpenTelemetry is currently DISABLED due to ESM compatibility issues
 * with @vercel/otel on Vercel's serverless functions.
 *
 * These functions are no-ops that preserve the API for when
 * tracing is re-enabled.
 *
 * Usage:
 *   import { withTrace, traceDbQuery } from '@/lib/telemetry';
 *
 *   // Trace any async operation
 *   const result = await withTrace('operation.name', async (span) => {
 *     span.setAttribute('custom.attr', 'value');
 *     return doSomething();
 *   });
 *
 *   // Trace database queries
 *   const users = await traceDbQuery('find', 'users', () => User.find());
 */

/**
 * Minimal Span interface for compatibility with existing code.
 * Currently a no-op stub.
 */
export interface MinimalSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/** No-op span implementation */
const noopSpan: MinimalSpan = {
  setAttribute: () => {},
  setAttributes: () => {},
  setStatus: () => {},
  end: () => {},
};

/**
 * Wrap an async function with a trace span.
 * Currently a no-op passthrough.
 *
 * @param name - Span name (e.g., 'auth.session.create')
 * @param fn - Async function to trace
 * @param _attributes - Optional initial attributes (ignored)
 */
export async function withTrace<T>(
  _name: string,
  fn: (span: MinimalSpan) => Promise<T>,
  _attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return fn(noopSpan);
}

/**
 * Trace a database query with standard attributes.
 * Currently a no-op passthrough.
 *
 * @param _operation - DB operation (find, create, update, delete)
 * @param _collection - Collection name
 * @param fn - Query function
 */
export async function traceDbQuery<T>(
  _operation: string,
  _collection: string,
  fn: () => Promise<T>,
): Promise<T> {
  return fn();
}

/**
 * Get current trace context for log correlation.
 * Currently returns null (tracing disabled).
 *
 * @returns null (tracing disabled)
 */
export function getTraceContext(): { traceId: string; spanId: string } | null {
  return null;
}

/**
 * Get the current active context for context propagation.
 * Currently returns undefined (tracing disabled).
 */
export function getActiveContext(): undefined {
  return undefined;
}
