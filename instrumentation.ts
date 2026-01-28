/**
 * Next.js instrumentation hook
 *
 * This file is automatically loaded by Next.js when the app starts.
 * OpenTelemetry is currently disabled due to ESM compatibility issues
 * with @vercel/otel on Vercel's serverless functions.
 *
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */

export async function register() {
  // OpenTelemetry disabled - causes ESM errors on Vercel:
  // "Error: require() of ES Module ... from /var/task/node_modules"
  // TODO: Re-enable when @vercel/otel ESM compatibility is resolved
  //
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   await import('./instrumentation.node');
  // }
}
