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
 *   const users = await traceDbQuery('select', 'users', () => db.select().from(users));
 */

import { type Span, SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('family-recipes');

/**
 * Wrap an async function with a trace span
 */
export async function withTrace<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes);
      }
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace a database query with standard attributes
 */
export async function traceDbQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withTrace(`db.${operation}`, async (span) => {
    span.setAttributes({
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.sql.table': table,
    });
    return fn();
  });
}

/**
 * Get current trace context for log correlation
 */
export function getTraceContext(): { traceId: string; spanId: string } | null {
  const span = trace.getActiveSpan();
  if (!span) {
    return null;
  }

  const context = span.spanContext();
  return {
    traceId: context.traceId,
    spanId: context.spanId,
  };
}
