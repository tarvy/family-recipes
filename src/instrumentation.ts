/**
 * Next.js instrumentation hook.
 *
 * Tracing is intentionally disabled. This no-op keeps the entrypoint present
 * without pulling in OTEL dependencies that break Vercel runtime.
 */
export async function register(): Promise<void> {
  return;
}
