/**
 * Device API keys for machine clients such as phone Shortcuts.
 *
 * A token is `frk_` + a 16-character key id + a 43-character secret
 * (32 random bytes, base64url). The database stores the key id and the
 * SHA-256 of the secret. The owning user's role is re-checked on every
 * request, so demoting a user disables their keys.
 *
 * Usage:
 *   const auth = await authenticateApiKey(request, 'captures:write');
 *   if (!auth.ok) {
 *     return unauthorized(auth.reason);
 *   }
 *
 *   const minted = await mintApiKey({ email, label, scopes: ['captures:write'] });
 */

import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { connectDB } from '@/db/connection';
import { ApiKey } from '@/db/models/api-key.model';
import { User } from '@/db/models/user.model';
import type { ApiKeyScope, IApiKey, UserRole } from '@/db/types';
import { normalizeEmail } from '@/lib/auth/allowlist';
import { isFamilyRole } from '@/lib/auth/authorization';
import { logger } from '@/lib/logger';
import { generateSecureToken, sha256Hex, timingSafeEqual } from '@/lib/oauth/crypto';
import { traceDbQuery, withTrace } from '@/lib/telemetry';

export type { ApiKeyScope } from '@/db/types';

const TOKEN_PREFIX = 'frk_';
const KEY_ID_LENGTH = 16;
const SECRET_BYTES = 32;
/** base64url length of SECRET_BYTES */
const SECRET_LENGTH = 43;
const TOKEN_LENGTH = TOKEN_PREFIX.length + KEY_ID_LENGTH + SECRET_LENGTH;
const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;
const COLLECTION_NAME = 'api_keys';

export interface ApiKeyPrincipal {
  readonly keyId: string;
  readonly userId: string;
}

/** `invalid` covers unknown, revoked, and wrong-secret keys; logs tell them apart. */
export type ApiKeyFailure = 'missing' | 'invalid' | 'insufficient_scope' | 'forbidden_role';

export type ApiKeyAuth =
  | { readonly ok: true; readonly principal: ApiKeyPrincipal }
  | { readonly ok: false; readonly reason: ApiKeyFailure };

export interface MintedApiKey {
  readonly keyId: string;
  /** Returned once. Never stored or logged by the server. */
  readonly token: string;
  readonly label: string;
}

export interface ApiKeySummary {
  readonly keyId: string;
  readonly label: string;
  readonly email: string | null;
  readonly role: UserRole | null;
  readonly scopes: readonly ApiKeyScope[];
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
  readonly revokedAt: Date | null;
}

interface PresentedToken {
  readonly keyId: string;
  readonly secret: string;
}

function parseBearerToken(header: string): PresentedToken | null {
  const token = BEARER_PATTERN.exec(header.trim())?.[1];
  if (!token?.startsWith(TOKEN_PREFIX) || token.length !== TOKEN_LENGTH) {
    return null;
  }
  const body = token.slice(TOKEN_PREFIX.length);
  return { keyId: body.slice(0, KEY_ID_LENGTH), secret: body.slice(KEY_ID_LENGTH) };
}

function rejectionCause(key: IApiKey | null, secret: string): string | null {
  if (!key) {
    return 'unknown_key';
  }
  if (key.revokedAt) {
    return 'revoked';
  }
  return timingSafeEqual(sha256Hex(secret), key.secretHash) ? null : 'wrong_secret';
}

/**
 * Authenticate `Authorization: Bearer frk_…`. Other bearer formats, such as
 * MCP OAuth tokens, are `invalid`. Records lastUsedAt on success.
 */
export async function authenticateApiKey(
  request: Request,
  scope: ApiKeyScope,
): Promise<ApiKeyAuth> {
  return withTrace('auth.apiKey.authenticate', async (span) => {
    const deny = (reason: ApiKeyFailure): ApiKeyAuth => {
      span.setAttribute('auth_failure', reason);
      return { ok: false, reason };
    };

    const header = request.headers.get('authorization');
    if (!header) {
      return deny('missing');
    }
    const presented = parseBearerToken(header);
    if (!presented) {
      return deny('invalid');
    }
    span.setAttribute('key_id', presented.keyId);

    await connectDB();
    const key = await traceDbQuery('findOne', COLLECTION_NAME, () =>
      ApiKey.findOne({ keyId: presented.keyId }).exec(),
    );
    const cause = rejectionCause(key, presented.secret);
    if (!key || cause) {
      logger.auth.warn('API key rejected', { keyId: presented.keyId, cause });
      return deny('invalid');
    }
    if (!key.scopes.includes(scope)) {
      logger.auth.warn('API key lacks scope', { keyId: key.keyId, scope });
      return deny('insufficient_scope');
    }

    const user = await traceDbQuery('findOne', 'users', () => User.findById(key.userId).exec());
    if (!(user && isFamilyRole(user.role))) {
      logger.auth.warn('API key owner lacks a family role', {
        keyId: key.keyId,
        role: user?.role ?? null,
      });
      return deny('forbidden_role');
    }

    await traceDbQuery('updateOne', COLLECTION_NAME, () =>
      ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).exec(),
    );
    return { ok: true, principal: { keyId: key.keyId, userId: user.id } };
  });
}

/** CLI only. The user must have signed in once and hold a family role. */
export async function mintApiKey(input: {
  email: string;
  label: string;
  scopes: readonly ApiKeyScope[];
}): Promise<MintedApiKey> {
  return withTrace('auth.apiKey.mint', async () => {
    const label = input.label.trim();
    if (!label) {
      throw new Error('A label is required, for example "Sam\'s iPhone"');
    }
    if (input.scopes.length === 0) {
      throw new Error('At least one scope is required');
    }

    await connectDB();
    const email = normalizeEmail(input.email);
    const user = await traceDbQuery('findOne', 'users', () => User.findOne({ email }).exec());
    if (!user) {
      throw new Error(`No user with email ${email}. They must sign in once first.`);
    }
    if (!isFamilyRole(user.role)) {
      throw new Error(`${email} has role ${user.role}; device keys need owner or family`);
    }

    const keyId = generateSecureToken(KEY_ID_LENGTH);
    const secret = crypto.randomBytes(SECRET_BYTES).toString('base64url');
    await traceDbQuery('create', COLLECTION_NAME, () =>
      ApiKey.create({
        keyId,
        secretHash: sha256Hex(secret),
        label,
        userId: user._id,
        scopes: [...input.scopes],
      }),
    );

    logger.auth.info('API key minted', { keyId, userId: user.id, label });
    return { keyId, token: `${TOKEN_PREFIX}${keyId}${secret}`, label };
  });
}

export async function listApiKeys(): Promise<readonly ApiKeySummary[]> {
  return withTrace('auth.apiKey.list', async () => {
    await connectDB();
    const keys = await traceDbQuery('find', COLLECTION_NAME, () =>
      ApiKey.find().sort({ createdAt: -1 }).lean<IApiKey[]>().exec(),
    );
    const users = await traceDbQuery('find', 'users', () =>
      User.find({ _id: { $in: keys.map((key) => key.userId) } })
        .lean<{ _id: Types.ObjectId; email: string; role: UserRole }[]>()
        .exec(),
    );
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return keys.map((key) => {
      const owner = usersById.get(key.userId.toString());
      return {
        keyId: key.keyId,
        label: key.label,
        email: owner?.email ?? null,
        role: owner?.role ?? null,
        scopes: key.scopes,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        revokedAt: key.revokedAt,
      };
    });
  });
}

/** Sets revokedAt once. Idempotent. Returns false for an unknown key id. */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  return withTrace('auth.apiKey.revoke', async (span) => {
    span.setAttribute('key_id', keyId);
    await connectDB();

    const result = await traceDbQuery('updateOne', COLLECTION_NAME, () =>
      ApiKey.updateOne({ keyId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec(),
    );
    if (result.matchedCount > 0) {
      logger.auth.info('API key revoked', { keyId });
      return true;
    }

    const existing = await traceDbQuery('exists', COLLECTION_NAME, () =>
      ApiKey.exists({ keyId }).exec(),
    );
    return existing !== null;
  });
}
