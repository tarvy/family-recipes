/**
 * Next.js instrumentation hook
 *
 * This file is automatically loaded by Next.js when the app starts.
 * It initializes OpenTelemetry for server-side tracing.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */

export async function register() {
  // Only initialize OpenTelemetry in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
}
