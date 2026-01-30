/**
 * Health check endpoint for verifying runtime connectivity.
 *
 * Performs a MongoDB ping and returns connection status with latency.
 */

import { connectDB, getConnectionState } from '@/db/connection';
import { logger, withRequestContext } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const HEALTH_OK_STATUS = 200;
const HEALTH_ERROR_STATUS = 500;

type HealthResponse = {
  status: 'ok' | 'error';
  db: {
    status: string;
    latencyMs?: number;
    error?: string;
  };
};

export async function GET(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.health', async (span) => {
      logger.api.info('Health check requested', { path: '/api/health' });

      try {
        const connection = await connectDB();
        const pingStartedAt = Date.now();

        await traceDbQuery('ping', 'admin', async () => {
          const db = connection.connection.db;
          if (!db) {
            throw new Error('MongoDB connection not initialized');
          }
          await db.admin().command({ ping: 1 });
        });

        const pingLatencyMs = Date.now() - pingStartedAt;
        span.setAttribute('db.ping_ms', pingLatencyMs);

        const response: HealthResponse = {
          status: 'ok',
          db: {
            status: getConnectionState(),
            latencyMs: pingLatencyMs,
          },
        };

        return Response.json(response, { status: HEALTH_OK_STATUS });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.api.error('Health check failed', error instanceof Error ? error : undefined);

        const response: HealthResponse = {
          status: 'error',
          db: {
            status: getConnectionState(),
            error: errorMessage,
          },
        };

        return Response.json(response, { status: HEALTH_ERROR_STATUS });
      }
    }),
  );
}
