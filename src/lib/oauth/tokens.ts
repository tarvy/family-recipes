/**
 * JWT access token and refresh token management.
 */

import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { generateSecureToken, sha256Hex, timingSafeEqual } from './crypto';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  type AccessTokenPayload,
  CLIENT_ID_LENGTH,
  CLIENT_SECRET_LENGTH,
  CODE_LENGTH,
  REFRESH_TOKEN_LENGTH,
} from './types';

/** JWT header for HS256 */
const JWT_HEADER = { alg: 'HS256', typ: 'JWT' };

/** Number of parts in a valid JWT */
const JWT_PARTS_COUNT = 3;

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/**
 * Get the JWT secret from environment.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required for OAuth token signing');
  }
  return secret;
}

/**
 * Get the OAuth issuer URL from environment.
 */
export function getOAuthIssuer(): string {
  const issuer = process.env.OAUTH_ISSUER ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!issuer) {
    throw new Error('OAUTH_ISSUER or NEXT_PUBLIC_APP_URL is required');
  }
  return issuer;
}

/**
 * Base64url encode a string or buffer.
 */
function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer.toString('base64url');
}

/**
 * Base64url decode to string.
 */
function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Create HMAC-SHA256 signature.
 */
function createSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Generate a JWT access token.
 */
export function generateAccessToken(
  clientId: string,
  userId: Types.ObjectId,
  scope: string,
): string {
  const now = Math.floor(Date.now() / MS_PER_SECOND);
  const issuer = getOAuthIssuer();

  const payload: AccessTokenPayload = {
    sub: clientId,
    iss: issuer,
    scope,
    user_id: userId.toString(),
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };

  const header = base64UrlEncode(JSON.stringify(JWT_HEADER));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(`${header}.${body}`, getJwtSecret());

  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT access token.
 * Returns null if token is invalid or expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== JWT_PARTS_COUNT) {
      return null;
    }

    const [header, body, signature] = parts;
    if (!(header && body && signature)) {
      return null;
    }

    // Verify signature
    const expectedSignature = createSignature(`${header}.${body}`, getJwtSecret());
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(body)) as unknown;

    if (!isAccessTokenPayload(payload)) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / MS_PER_SECOND);
    if (payload.exp <= now) {
      return null;
    }

    // Verify issuer
    const expectedIssuer = getOAuthIssuer();
    if (payload.iss !== expectedIssuer) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Type guard for AccessTokenPayload.
 */
function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record['sub'] === 'string' &&
    typeof record['iss'] === 'string' &&
    typeof record['scope'] === 'string' &&
    typeof record['user_id'] === 'string' &&
    typeof record['exp'] === 'number' &&
    typeof record['iat'] === 'number'
  );
}

/**
 * Generate a new client ID.
 */
export function generateClientId(): string {
  return generateSecureToken(CLIENT_ID_LENGTH);
}

/**
 * Generate a new client secret.
 */
export function generateClientSecret(): string {
  return generateSecureToken(CLIENT_SECRET_LENGTH);
}

/**
 * Generate a new authorization code.
 */
export function generateAuthorizationCode(): string {
  return generateSecureToken(CODE_LENGTH);
}

/**
 * Generate a new refresh token.
 */
export function generateRefreshToken(): string {
  return generateSecureToken(REFRESH_TOKEN_LENGTH);
}

/**
 * Hash a client secret for storage.
 */
export function hashClientSecret(secret: string): string {
  return sha256Hex(secret);
}

/**
 * Verify a client secret against its hash.
 */
export function verifyClientSecret(secret: string, hash: string): boolean {
  const computedHash = sha256Hex(secret);
  return timingSafeEqual(computedHash, hash);
}

/**
 * Hash a refresh token for storage.
 */
export function hashRefreshToken(token: string): string {
  return sha256Hex(token);
}
