/**
 * POST /api/recipes/sync
 *
 * Synchronize Cooklang recipes from filesystem to MongoDB.
 *
 * Auth: Session with owner role OR X-Webhook-Secret header.
 *
 * Query params:
 * - mode: 'full' | 'incremental' (default: 'full')
 *
 * Body (optional):
 * - mode: 'full' | 'incremental'
 * - dryRun: boolean
 */

import { cookies } from 'next/headers';
import { getSessionFromCookies, type SessionUser } from '@/lib/auth';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { type SyncOptions, syncRecipes } from '@/lib/git-recipes';
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

/** Maximum sync duration in seconds (5 minutes) */
export const maxDuration = 300;

/** Owner role constant */
const OWNER_ROLE = 'owner';

/** Webhook secret header name */
const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

interface SyncRequestBody {
  mode?: 'full' | 'incremental';
  dryRun?: boolean;
}

type AuthResult =
  | { authorized: true; method: 'session' | 'webhook'; user?: SessionUser }
  | { authorized: false; method: 'session' | 'none'; errorResponse: Response };

/**
 * Validate webhook secret from header
 */
function validateWebhookSecret(request: Request): boolean {
  const secret = process.env['RECIPE_SYNC_SECRET'];
  if (!secret) {
    return false;
  }
  const headerValue = request.headers.get(WEBHOOK_SECRET_HEADER);
  return headerValue === secret;
}

/**
 * Check authentication and authorization
 */
async function checkAuth(request: Request): Promise<AuthResult> {
  const hasValidWebhookSecret = validateWebhookSecret(request);
  if (hasValidWebhookSecret) {
    return { authorized: true, method: 'webhook' };
  }

  const cookieStore = await cookies();
  const user = await getSessionFromCookies(cookieStore);

  if (!user) {
    return {
      authorized: false,
      method: 'none',
      errorResponse: Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED }),
    };
  }

  if (user.role !== OWNER_ROLE) {
    logger.recipes.warn('Non-owner attempted to sync recipes', { userId: user.id });
    return {
      authorized: false,
      method: 'session',
      errorResponse: Response.json({ error: 'forbidden' }, { status: HTTP_FORBIDDEN }),
    };
  }

  return { authorized: true, method: 'session', user };
}

/**
 * Parse request body safely
 */
async function parseRequestBody(request: Request): Promise<SyncRequestBody> {
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return (await request.json()) as SyncRequestBody;
    }
  } catch {
    // Empty or invalid body is ok
  }
  return {};
}

/**
 * Determine sync mode from body or query params
 */
function determineSyncMode(body: SyncRequestBody, url: URL): 'full' | 'incremental' | null {
  const queryMode = url.searchParams.get('mode');
  const mode = body.mode ?? (queryMode === 'incremental' ? 'incremental' : 'full');

  if (mode !== 'full' && mode !== 'incremental') {
    return null;
  }
  return mode;
}

/**
 * Execute the sync and return the result
 */
async function executeSyncAndRespond(options: SyncOptions): Promise<Response> {
  const result = await syncRecipes(options);
  return Response.json({
    success: result.success,
    summary: result.summary,
    durationMs: result.durationMs,
    ...(result.errors.length > 0 && { errors: result.errors }),
  });
}

/**
 * Handle sync error
 */
function handleSyncError(error: unknown): Response {
  const message = toErrorMessage(error) === 'unknown' ? 'Sync failed' : toErrorMessage(error);
  logger.recipes.error('Recipe sync endpoint failed', toError(error));
  return Response.json({ error: 'sync_failed', message }, { status: HTTP_INTERNAL_SERVER_ERROR });
}

/**
 * Build sync options from request body
 */
function buildSyncOptions(body: SyncRequestBody, mode: 'full' | 'incremental'): SyncOptions {
  return { mode, dryRun: body.dryRun ?? false };
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.recipes.sync', async (span) => {
      const authResult = await checkAuth(request);
      span.setAttribute('auth_method', authResult.method);

      if (!authResult.authorized) {
        span.setAttribute('error', authResult.method === 'none' ? 'unauthorized' : 'forbidden');
        return authResult.errorResponse;
      }

      const body = await parseRequestBody(request);
      const mode = determineSyncMode(body, new URL(request.url));

      if (!mode) {
        span.setAttribute('error', 'invalid_mode');
        return Response.json(
          { error: 'invalid_mode', message: 'Mode must be "full" or "incremental"' },
          { status: HTTP_BAD_REQUEST },
        );
      }

      const options = buildSyncOptions(body, mode);
      span.setAttribute('sync_mode', mode);
      span.setAttribute('dry_run', options.dryRun ?? false);
      logger.recipes.info('Starting recipe sync', {
        mode,
        dryRun: options.dryRun,
        authMethod: authResult.method,
      });

      try {
        return await executeSyncAndRespond(options);
      } catch (error) {
        span.setAttribute('error', toErrorMessage(error));
        return handleSyncError(error);
      }
    }),
  );
}
