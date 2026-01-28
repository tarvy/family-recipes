/**
 * Telemetry helpers for tracing operations
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
 *
 * Note: Tracing is disabled in environments where OpenTelemetry
 * cannot be loaded (e.g., Vercel serverless with ESM).
 */

/** Minimal Span interface for when OpenTelemetry is not available */
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
 * Falls back to no-op tracing if OpenTelemetry is unavailable.
 */
export async function withTrace<T>(
  _name: string,
  fn: (span: MinimalSpan) => Promise<T>,
  _attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  // Use no-op tracing - OpenTelemetry disabled for Vercel compatibility
  return fn(noopSpan);
}

/**
 * Trace a database query with standard attributes
 */
export async function traceDbQuery<T>(
  _operation: string,
  _collection: string,
  fn: () => Promise<T>,
): Promise<T> {
  // No-op tracing - just execute the function
  return fn();
}

/**
 * Get current trace context for log correlation
 */
export function getTraceContext(): { traceId: string; spanId: string } | null {
  // Tracing disabled - no context available
  return null;
}
