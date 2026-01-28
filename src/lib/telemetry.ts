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
 * Note: Tracing is automatically enabled via @vercel/otel when
 * instrumentation.ts is loaded by Next.js.
 */

import type { Span } from '@opentelemetry/api';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';

/** Service name for tracer */
const SERVICE_NAME = 'family-recipes';

/** Standard attribute keys */
const ATTR = {
  DB_OPERATION: 'db.operation',
  DB_COLLECTION: 'db.collection',
  ERROR: 'error',
  ERROR_MESSAGE: 'error.message',
} as const;

/** Get the tracer instance */
function getTracer() {
  return trace.getTracer(SERVICE_NAME);
}

/**
 * Minimal Span interface for compatibility with existing code.
 * Maps to OpenTelemetry Span methods.
 */
export interface MinimalSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/**
 * Adapter to convert OpenTelemetry Span to MinimalSpan interface.
 * This preserves API compatibility with existing code.
 */
function toMinimalSpan(span: Span): MinimalSpan {
  return {
    setAttribute: (key, value) => span.setAttribute(key, value),
    setAttributes: (attrs) => span.setAttributes(attrs),
    setStatus: ({ code, message }) => {
      // Map numeric code to SpanStatusCode
      // 0 = UNSET, 1 = OK, 2 = ERROR
      const statusCode =
        code === 2 ? SpanStatusCode.ERROR : code === 1 ? SpanStatusCode.OK : SpanStatusCode.UNSET;
      span.setStatus(message ? { code: statusCode, message } : { code: statusCode });
    },
    end: () => span.end(),
  };
}

/**
 * Wrap an async function with a trace span.
 *
 * @param name - Span name (e.g., 'auth.session.create')
 * @param fn - Async function to trace
 * @param attributes - Optional initial attributes
 */
export async function withTrace<T>(
  name: string,
  fn: (span: MinimalSpan) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      const result = await fn(toMinimalSpan(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.setAttribute(ATTR.ERROR, true);
      if (error instanceof Error) {
        span.setAttribute(ATTR.ERROR_MESSAGE, error.message);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace a database query with standard attributes.
 *
 * @param operation - DB operation (find, create, update, delete)
 * @param collection - Collection name
 * @param fn - Query function
 */
export async function traceDbQuery<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withTrace(`db.${operation}`, async (span) => {
    span.setAttribute(ATTR.DB_OPERATION, operation);
    span.setAttribute(ATTR.DB_COLLECTION, collection);
    return fn();
  });
}

/**
 * Get current trace context for log correlation.
 *
 * @returns Trace and span IDs if available, null otherwise
 */
export function getTraceContext(): { traceId: string; spanId: string } | null {
  const span = trace.getActiveSpan();
  if (!span) {
    return null;
  }

  const ctx = span.spanContext();

  // Check for valid trace context (not all zeros)
  if (ctx.traceId === '00000000000000000000000000000000') {
    return null;
  }

  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}

/**
 * Get the current active context for context propagation.
 * Useful for passing context to worker threads or external calls.
 */
export function getActiveContext() {
  return context.active();
}
