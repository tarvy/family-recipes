/**
 * Passkey (WebAuthn) authentication helpers.
 */

import crypto from 'node:crypto';
import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import type { IPasskeyDocument } from '@/db/models';
import type { SessionUser } from './session';

const DEFAULT_APP_URL = 'http://localhost:3000';
const PASSKEY_RP_NAME = 'Family Recipes';
const PASSKEY_CHALLENGE_COOKIE_NAME = 'passkey_challenge';
const PASSKEY_CHALLENGE_TTL_SECONDS = 5 * 60;

const PASSKEY_CHALLENGE_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: PASSKEY_CHALLENGE_TTL_SECONDS,
};

const ALLOWED_TRANSPORTS = [
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
] as const;

type AllowedTransport = (typeof ALLOWED_TRANSPORTS)[number];

type PasskeyChallengeType = 'registration' | 'authentication';

interface PasskeyChallengePayload {
  challenge: string;
  type: PasskeyChallengeType;
  createdAt: number;
  userId?: string;
}

export interface PasskeyChallengeCookie {
  name: string;
  value: string;
  options: Partial<ResponseCookie>;
}

export function getPasskeyChallengeCookieName(): string {
  return PASSKEY_CHALLENGE_COOKIE_NAME;
}

export function getPasskeyChallengeCookieOptions(): Partial<ResponseCookie> {
  return PASSKEY_CHALLENGE_COOKIE_OPTIONS;
}

export function buildPasskeyChallengeCookie(
  payload: PasskeyChallengePayload,
): PasskeyChallengeCookie {
  const token = createSignedChallengeToken(payload);
  return {
    name: PASSKEY_CHALLENGE_COOKIE_NAME,
    value: token,
    options: PASSKEY_CHALLENGE_COOKIE_OPTIONS,
  };
}

export function parsePasskeyChallengeCookie(token: string): PasskeyChallengePayload | null {
  return parseSignedChallengeToken(token);
}

export function buildRegistrationOptions(
  user: SessionUser,
  passkeys: IPasskeyDocument[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const rpId = getRpId();
  const userIdBytes = isoUint8Array.fromUTF8String(user.id);
  const excludeCredentials = passkeys.map((passkey) => ({
    id: passkey.credentialId,
    transports: normalizeTransports(passkey.transports),
  }));

  return generateRegistrationOptions({
    rpName: PASSKEY_RP_NAME,
    rpID: rpId,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    userID: userIdBytes,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials,
  });
}

export function buildAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const rpId = getRpId();
  return generateAuthenticationOptions({
    rpID: rpId,
    userVerification: 'preferred',
  });
}

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<Awaited<ReturnType<typeof verifyRegistrationResponse>>> {
  const { expectedOrigin, rpId } = getWebAuthnConfig();

  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpId,
    requireUserVerification: true,
  });
}

export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  credential: WebAuthnCredential,
  expectedChallenge: string,
): Promise<Awaited<ReturnType<typeof verifyAuthenticationResponse>>> {
  const { expectedOrigin, rpId } = getWebAuthnConfig();

  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpId,
    credential,
    requireUserVerification: true,
  });
}

export function toWebAuthnCredential(passkey: IPasskeyDocument): WebAuthnCredential {
  return {
    id: passkey.credentialId,
    publicKey: isoBase64URL.toBuffer(passkey.publicKey),
    counter: passkey.counter,
    transports: normalizeTransports(passkey.transports),
  };
}

export function serializePublicKey(publicKey: Uint8Array): string {
  return isoBase64URL.fromBuffer(publicKey);
}

export function getRpId(): string {
  if (process.env.WEBAUTHN_RP_ID) {
    return process.env.WEBAUTHN_RP_ID;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  return new URL(appUrl).hostname;
}

export function getExpectedOrigin(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  return new URL(appUrl).origin;
}

function getWebAuthnConfig(): { expectedOrigin: string; rpId: string } {
  return {
    expectedOrigin: getExpectedOrigin(),
    rpId: getRpId(),
  };
}

function normalizeTransports(transports?: string[]): AllowedTransport[] | undefined {
  if (!transports || transports.length === 0) {
    return undefined;
  }

  return transports.filter((transport): transport is AllowedTransport =>
    ALLOWED_TRANSPORTS.includes(transport as AllowedTransport),
  );
}

function createSignedChallengeToken(payload: PasskeyChallengePayload): string {
  const secret = getChallengeSecret();
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function parseSignedChallengeToken(token: string): PasskeyChallengePayload | null {
  const [encodedPayload, signature] = token.split('.', 2);

  if (!(encodedPayload && signature)) {
    return null;
  }

  const secret = getChallengeSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  const ageMs = Date.now() - payload.createdAt;
  if (ageMs > PASSKEY_CHALLENGE_TTL_SECONDS * 1000) {
    return null;
  }

  return payload;
}

function parsePayload(encodedPayload: string): PasskeyChallengePayload | null {
  try {
    const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;

    if (!isChallengePayload(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isChallengePayload(value: unknown): value is PasskeyChallengePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const { challenge, type, createdAt, userId } = record;

  if (typeof challenge !== 'string' || typeof type !== 'string' || typeof createdAt !== 'number') {
    return false;
  }

  if (type !== 'registration' && type !== 'authentication') {
    return false;
  }

  if (userId !== undefined && typeof userId !== 'string') {
    return false;
  }

  return true;
}

function getChallengeSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for passkey challenge signing');
  }
  return secret;
}

export type { PasskeyChallengePayload, PasskeyChallengeType };
