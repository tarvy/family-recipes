/**
 * POST /api/auth/passkey/authenticate
 *
 * Generate WebAuthn authentication options or verify an authentication response.
 */

import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/db/connection';
import { AllowedEmail, Passkey, User } from '@/db/models';
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import { ensureOwnerAllowlist, findAllowedEmail } from '@/lib/auth/allowlist';
import {
  buildAuthenticationOptions,
  buildPasskeyChallengeCookie,
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

    const cookie = buildPasskeyChallengeCookie({
      challenge: options.challenge,
      type: 'authentication',
      createdAt: Date.now(),
    });
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
    cookieStore.delete(getPasskeyChallengeCookieName());
    return Response.json({ error: 'invalid_challenge' }, { status: 400 });
  }

  try {
    await connectDB();

    const passkey = await traceDbQuery('findOne', 'passkeys', async () => {
      return Passkey.findOne({ credentialId: response.id });
    });

    if (!passkey) {
      logger.auth.warn('Passkey credential not found', { credentialId: response.id });
      cookieStore.delete(getPasskeyChallengeCookieName());
      return Response.json({ error: 'credential_not_found' }, { status: 404 });
    }

    const user = await traceDbQuery('findById', 'users', async () => {
      return User.findById(passkey.userId);
    });

    if (!user) {
      logger.auth.error('Passkey user not found', undefined, { userId: passkey.userId.toString() });
      cookieStore.delete(getPasskeyChallengeCookieName());
      return Response.json({ error: 'user_not_found' }, { status: 404 });
    }

    await ensureOwnerAllowlist();

    const allowed = await findAllowedEmail(user.email);
    if (!allowed) {
      logger.auth.warn('Passkey authentication blocked for non-allowlisted email', {
        email: user.email,
      });
      cookieStore.delete(getPasskeyChallengeCookieName());
      return Response.json({ error: 'not_allowed' }, { status: 403 });
    }

    if (user.role !== allowed.role) {
      await traceDbQuery('updateOne', 'users', async () => {
        return User.updateOne({ _id: user._id }, { $set: { role: allowed.role } });
      });
      logger.auth.info('User role updated from allowlist', {
        email: user.email,
        role: allowed.role,
      });
    }

    if (!allowed.firstSignedInAt) {
      await traceDbQuery('updateOne', 'allowedEmails', async () => {
        return AllowedEmail.updateOne(
          { _id: allowed._id },
          { $set: { firstSignedInAt: new Date() } },
        );
      });
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
      cookieStore.delete(getPasskeyChallengeCookieName());
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
    cookieStore.delete(getPasskeyChallengeCookieName());
    return Response.json({ error: 'authentication_failed' }, { status: 500 });
  }
}

function isAuthenticationResponse(value: unknown): value is AuthenticationResponseJSON {
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
