/**
 * POST /api/auth/passkey/authenticate
 *
 * Generate WebAuthn authentication options or verify an authentication response.
 */

import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/db/connection';
import { Passkey, User } from '@/db/models';
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import {
  buildAuthenticationOptions,
  getPasskeyChallengeCookieName,
  parsePasskeyChallengeCookie,
  toWebAuthnCredential,
  verifyPasskeyAuthentication,
} from '@/lib/auth/passkey';
import { logger } from '@/lib/logger';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

interface AuthenticateRequestBody {
  response?: AuthenticationResponseJSON;
}

const AUTH_PATH = '/api/auth/passkey/authenticate';

export async function POST(request: Request): Promise<Response> {
  return withTrace('api.auth.passkey.authenticate', async (span) => {
    logger.api.info('Passkey authentication requested', { path: AUTH_PATH });

    let body: AuthenticateRequestBody = {};
    try {
      body = (await request.json()) as AuthenticateRequestBody;
    } catch {
      body = {};
    }

    const cookieStore = await cookies();

    if (body.response) {
      if (!isAuthenticationResponse(body.response)) {
        span.setAttribute('error', 'invalid_payload');
        return Response.json({ error: 'invalid_payload' }, { status: 400 });
      }

      return handleVerification(body.response, cookieStore);
    }

    return handleOptions(cookieStore);
  });
}

async function handleOptions(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<Response> {
  try {
    const options = await buildAuthenticationOptions();

    const cookie = buildAuthenticationChallengeCookie(options.challenge);
    cookieStore.set(cookie.name, cookie.value, cookie.options);

    return Response.json({ options });
  } catch (error) {
    logger.auth.error(
      'Passkey authentication options failed',
      error instanceof Error ? error : undefined,
    );
    return Response.json({ error: 'authentication_failed' }, { status: 500 });
  }
}

async function handleVerification(
  response: AuthenticationResponseJSON,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<Response> {
  const challengeToken = cookieStore.get(getPasskeyChallengeCookieName())?.value;
  const challenge = challengeToken ? parsePasskeyChallengeCookie(challengeToken) : null;

  if (!challenge || challenge.type !== 'authentication') {
    logger.auth.warn('Passkey authentication challenge missing or invalid');
    return Response.json({ error: 'invalid_challenge' }, { status: 400 });
  }

  try {
    await connectDB();

    const passkey = await traceDbQuery('findOne', 'passkeys', async () => {
      return Passkey.findOne({ credentialId: response.id });
    });

    if (!passkey) {
      logger.auth.warn('Passkey credential not found', { credentialId: response.id });
      return Response.json({ error: 'credential_not_found' }, { status: 404 });
    }

    const user = await traceDbQuery('findById', 'users', async () => {
      return User.findById(passkey.userId);
    });

    if (!user) {
      logger.auth.error('Passkey user not found', undefined, { userId: passkey.userId.toString() });
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    const credential = toWebAuthnCredential(passkey);
    const verification = await verifyPasskeyAuthentication(
      response,
      credential,
      challenge.challenge,
    );

    if (!verification.verified) {
      logger.auth.warn('Passkey authentication verification failed', {
        credentialId: response.id,
      });
      return Response.json({ error: 'verification_failed' }, { status: 400 });
    }

    const { authenticationInfo } = verification;

    await traceDbQuery('updateOne', 'passkeys', async () => {
      return Passkey.updateOne(
        { _id: passkey._id },
        {
          $set: {
            counter: authenticationInfo.newCounter,
            lastUsedAt: new Date(),
            deviceType: authenticationInfo.credentialDeviceType,
            backedUp: authenticationInfo.credentialBackedUp,
          },
        },
      );
    });

    const session = await createSession(user._id.toString());
    cookieStore.set(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);
    cookieStore.delete(getPasskeyChallengeCookieName());

    logger.auth.info('Passkey authentication successful', {
      userId: user._id.toString(),
      credentialId: passkey.credentialId,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.auth.error('Passkey authentication failed', error instanceof Error ? error : undefined);
    return Response.json({ error: 'authentication_failed' }, { status: 500 });
  }
}

function buildAuthenticationChallengeCookie(challenge: string) {
  return {
    name: getPasskeyChallengeCookieName(),
    value: buildChallengeToken(challenge),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 5 * 60,
    },
  };
}

function buildChallengeToken(challenge: string): string {
  const payload = {
    challenge,
    type: 'authentication',
    createdAt: Date.now(),
  };

  return buildSignedChallengeToken(payload);
}

function buildSignedChallengeToken(payload: {
  challenge: string;
  type: string;
  createdAt: number;
}): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = getChallengeSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function getChallengeSignature(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for passkey challenge signing');
  }

  return require('node:crypto').createHmac('sha256', secret).update(value).digest('base64url');
}

function isAuthenticationResponse(value: unknown): value is AuthenticationResponseJSON {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.rawId === 'string' &&
    typeof record.type === 'string' &&
    typeof record.response === 'object' &&
    record.response !== null
  );
}
