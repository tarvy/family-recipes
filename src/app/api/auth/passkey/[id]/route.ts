/**
 * DELETE /api/auth/passkey/[id]
 *
 * Revoke a passkey owned by the current user.
 */

import { Types } from 'mongoose';
import { cookies } from 'next/headers';
import { connectDB } from '@/db/connection';
import { Passkey } from '@/db/models';
import { getSessionFromCookies } from '@/lib/auth';
import {
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger, withRequestContext } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.auth.passkey.revoke', async (span) => {
      const user = await getSessionFromCookies(await cookies());

      if (!user) {
        span.setAttribute('error', 'unauthorized');
        return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
      }

      const { id } = await context.params;
      if (!Types.ObjectId.isValid(id)) {
        span.setAttribute('error', 'invalid_id');
        return Response.json({ error: 'invalid_id' }, { status: HTTP_BAD_REQUEST });
      }

      await connectDB();
      const deleted = await traceDbQuery('findOneAndDelete', 'passkeys', async () => {
        return Passkey.findOneAndDelete({ _id: id, userId: user.id });
      });

      if (!deleted) {
        span.setAttribute('error', 'not_found');
        logger.auth.warn('Passkey revoke target not found', {
          userId: user.id,
          passkeyId: id,
        });
        return Response.json({ error: 'not_found' }, { status: HTTP_NOT_FOUND });
      }

      logger.auth.info('Passkey revoked', {
        userId: user.id,
        passkeyId: id,
      });

      return Response.json({ success: true });
    }),
  );
}
