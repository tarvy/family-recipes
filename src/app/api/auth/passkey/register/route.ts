/**
 * POST /api/auth/passkey/register
 *
 * Generate WebAuthn registration options or verify a registration response.
 */

import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/db/connection';
import { Passkey } from '@/db/models';
import { getSessionFromCookies, type SessionUser } from '@/lib/auth';
import { ensureOwnerAllowlist, findAllowedEmail } from '@/lib/auth/allowlist';
import {
  buildPasskeyChallengeCookie,
  buildRegistrationOptions,
  getPasskeyChallengeCookieName,
  parsePasskeyChallengeCookie,
  serializePublicKey,
  verifyPasskeyRegistration,
} from '@/lib/auth/passkey';
import {
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { toError } from '@/lib/errors';
import { logger, withRequestContext } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RegisterRequestBody {
  response?: RegistrationResponseJSON;
}

const REGISTER_PATH = '/api/auth/passkey/register';

type AuthCheckResult =
  | { authorized: true; user: SessionUser }
  | { authorized: false; response: Response; error: string };

/** Check user is authenticated and allowlisted */
async function checkUserAllowed(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<AuthCheckResult> {
  const user = await getSessionFromCookies(cookieStore);
  if (!user) {
    return {
      authorized: false,
      error: 'unauthorized',
      response: Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED }),
    };
  }

  await ensureOwnerAllowlist();
  const allowed = await findAllowedEmail(user.email);
  if (!allowed) {
    logger.auth.warn('Passkey registration blocked for non-allowlisted email', {
      email: user.email,
    });
    return {
      authorized: false,
      error: 'not_allowed',
      response: Response.json({ error: 'not_allowed' }, { status: HTTP_FORBIDDEN }),
    };
  }

  return { authorized: true, user };
}

export async function POST(request: Request): Promise<Response> {
  return withRequestContext(request, () =>
    withTrace('api.auth.passkey.register', async (span) => {
      logger.api.info('Passkey registration requested', { path: REGISTER_PATH });

      const cookieStore = await cookies();
      const authCheck = await checkUserAllowed(cookieStore);
      if (!authCheck.authorized) {
        span.setAttribute('error', authCheck.error);
        return authCheck.response;
      }

      const { user } = authCheck;

      let body: RegisterRequestBody = {};
      try {
        body = (await request.json()) as RegisterRequestBody;
      } catch {
        body = {};
      }

      if (body.response) {
        if (!isRegistrationResponse(body.response)) {
          span.setAttribute('error', 'invalid_payload');
          return Response.json({ error: 'invalid_payload' }, { status: HTTP_BAD_REQUEST });
        }

        return handleVerification(body.response, user.id, cookieStore);
      }

      return handleOptions(user, cookieStore);
    }),
  );
}

function isRegistrationResponse(value: unknown): value is RegistrationResponseJSON {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record['id'] === 'string' &&
    typeof record['rawId'] === 'string' &&
    typeof record['type'] === 'string' &&
    typeof record['response'] === 'object' &&
    record['response'] !== null
  );
}

async function handleOptions(
  user: SessionUser,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<Response> {
  try {
    await connectDB();

    const existingPasskeys = await traceDbQuery('find', 'passkeys', async () => {
      return Passkey.find({ userId: user.id });
    });

    const options = await buildRegistrationOptions(user, existingPasskeys);

    const cookie = buildPasskeyChallengeCookie({
      challenge: options.challenge,
      type: 'registration',
      createdAt: Date.now(),
      userId: user.id,
    });

    cookieStore.set(cookie.name, cookie.value, cookie.options);

    return Response.json({ options });
  } catch (error) {
    logger.auth.error('Passkey registration options failed', toError(error));
    return Response.json({ error: 'registration_failed' }, { status: HTTP_INTERNAL_SERVER_ERROR });
  }
}

async function handleVerification(
  response: RegistrationResponseJSON,
  userId: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<Response> {
  const challengeToken = cookieStore.get(getPasskeyChallengeCookieName())?.value;
  const challenge = challengeToken ? parsePasskeyChallengeCookie(challengeToken) : null;

  if (!challenge || challenge.type !== 'registration' || challenge.userId !== userId) {
    logger.auth.warn('Passkey registration challenge missing or invalid');
    cookieStore.delete(getPasskeyChallengeCookieName());
    return Response.json({ error: 'invalid_challenge' }, { status: HTTP_BAD_REQUEST });
  }

  try {
    const verification = await verifyPasskeyRegistration(response, challenge.challenge);

    if (!(verification.verified && verification.registrationInfo)) {
      logger.auth.warn('Passkey registration verification failed');
      cookieStore.delete(getPasskeyChallengeCookieName());
      return Response.json({ error: 'verification_failed' }, { status: HTTP_BAD_REQUEST });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await connectDB();

    const existing = await traceDbQuery('findOne', 'passkeys', async () => {
      return Passkey.findOne({ credentialId: credential.id });
    });

    if (existing) {
      logger.auth.warn('Passkey credential already exists', { credentialId: credential.id });
      cookieStore.delete(getPasskeyChallengeCookieName());
      return Response.json({ error: 'credential_exists' }, { status: HTTP_CONFLICT });
    }

    await traceDbQuery('create', 'passkeys', async () => {
      return Passkey.create({
        userId,
        credentialId: credential.id,
        publicKey: serializePublicKey(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: response.response.transports ?? [],
        lastUsedAt: null,
      });
    });

    cookieStore.delete(getPasskeyChallengeCookieName());

    logger.auth.info('Passkey registered', { userId, credentialId: credential.id });

    return Response.json({ success: true });
  } catch (error) {
    logger.auth.error('Passkey registration verification error', toError(error));
    cookieStore.delete(getPasskeyChallengeCookieName());
    return Response.json({ error: 'verification_failed' }, { status: HTTP_INTERNAL_SERVER_ERROR });
  }
}
