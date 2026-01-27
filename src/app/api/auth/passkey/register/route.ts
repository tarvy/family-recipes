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
import {
  buildPasskeyChallengeCookie,
  buildRegistrationOptions,
  getPasskeyChallengeCookieName,
  parsePasskeyChallengeCookie,
  serializePublicKey,
  verifyPasskeyRegistration,
} from '@/lib/auth/passkey';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface RegisterRequestBody {
  response?: RegistrationResponseJSON;
}

const REGISTER_PATH = '/api/auth/passkey/register';

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.auth.passkey.register', async (span) => {
    logger.api.info('Passkey registration requested', { path: REGISTER_PATH });

    const cookieStore = await cookies();
    const user = await getSessionFromCookies(cookieStore);

    if (!user) {
      span.setAttribute('error', 'unauthorized');
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: RegisterRequestBody = {};
    try {
      body = (await request.json()) as RegisterRequestBody;
    } catch {
      body = {};
    }

    if (body.response) {
      return handleVerification(body.response, user.id, cookieStore);
    }

    return handleOptions(user, cookieStore);
  });
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
    logger.auth.error(
      'Passkey registration options failed',
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'registration_failed' }, { status: 500 });
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
    return Response.json({ error: 'invalid_challenge' }, { status: 400 });
  }

  try {
    const verification = await verifyPasskeyRegistration(response, challenge.challenge);

    if (!(verification.verified && verification.registrationInfo)) {
      logger.auth.warn('Passkey registration verification failed');
      return Response.json({ error: 'verification_failed' }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await connectDB();

    const existing = await traceDbQuery('findOne', 'passkeys', async () => {
      return Passkey.findOne({ credentialId: credential.id });
    });

    if (existing) {
      logger.auth.warn('Passkey credential already exists', { credentialId: credential.id });
      return Response.json({ error: 'credential_exists' }, { status: 409 });
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
    logger.auth.error(
      'Passkey registration verification error',
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'verification_failed' }, { status: 500 });
  }
}
