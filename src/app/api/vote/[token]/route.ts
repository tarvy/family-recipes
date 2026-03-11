/** GET + POST /api/vote/[token] — public, no auth required */

import {
  HTTP_BAD_REQUEST,
  HTTP_GONE,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
} from '@/lib/constants/http-status';
import { toError, toErrorMessage } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { addVote, findByVotingToken } from '@/lib/menu/repository';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.vote.get', async (span) => {
      const { token } = await params;
      span.setAttribute('has_token', Boolean(token));

      try {
        const menu = await findByVotingToken(token);
        if (!menu) {
          return Response.json({ error: 'Invalid voting token' }, { status: HTTP_NOT_FOUND });
        }

        const isOpen = menu.votingClosesAt ? new Date() < menu.votingClosesAt : false;

        return Response.json({
          assignments: menu.assignments,
          isOpen,
          votingClosesAt: menu.votingClosesAt?.toISOString() ?? null,
        });
      } catch (error) {
        logger.api.error('Failed to get vote data', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to get vote data' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}

const MIN_VOTER_NAME_LENGTH = 1;

function validateVoteBody(
  body: unknown,
):
  | { valid: true; voterName: string; voterToken: string; picks: string[] }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const data = body as Record<string, unknown>;

  if (typeof data['voterName'] !== 'string' || data['voterName'].length < MIN_VOTER_NAME_LENGTH) {
    return { valid: false, error: 'voterName is required' };
  }
  if (typeof data['voterToken'] !== 'string' || !data['voterToken']) {
    return { valid: false, error: 'voterToken is required' };
  }
  if (!Array.isArray(data['picks']) || data['picks'].length === 0) {
    return { valid: false, error: 'picks must be a non-empty array' };
  }

  const picks = data['picks'] as unknown[];
  if (!picks.every((p): p is string => typeof p === 'string')) {
    return { valid: false, error: 'picks must contain only strings' };
  }

  return {
    valid: true,
    voterName: data['voterName'] as string,
    voterToken: data['voterToken'] as string,
    picks: picks as string[],
  };
}

export async function POST(request: Request, { params }: RouteParams): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.vote.submit', async (span) => {
      const { token } = await params;
      span.setAttribute('has_token', Boolean(token));

      try {
        const menu = await findByVotingToken(token);
        if (!menu) {
          return Response.json({ error: 'Invalid voting token' }, { status: HTTP_NOT_FOUND });
        }

        const isOpen = menu.votingClosesAt ? new Date() < menu.votingClosesAt : false;
        if (!isOpen) {
          return Response.json({ error: 'Voting window has closed' }, { status: HTTP_GONE });
        }

        const body = await request.json();
        const validation = validateVoteBody(body);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: HTTP_BAD_REQUEST });
        }

        await addVote(menu._id.toString(), {
          voterName: validation.voterName,
          voterToken: validation.voterToken,
          picks: validation.picks,
        });

        return Response.json({ success: true });
      } catch (error) {
        logger.api.error('Failed to submit vote', toError(error));
        span.setAttribute('error', toErrorMessage(error));
        return Response.json(
          { error: 'Failed to submit vote' },
          { status: HTTP_INTERNAL_SERVER_ERROR },
        );
      }
    }),
  );
}
