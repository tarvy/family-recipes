/**
 * Dynamic client registration + token endpoint behavior for public
 * (`token_endpoint_auth_method: none`) and confidential clients. The database
 * layer is mocked; no MongoDB connection is made.
 */
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientCreate: vi.fn(),
  clientFindOne: vi.fn(),
  codeFindOneAndUpdate: vi.fn(),
  refreshFindOneAndUpdate: vi.fn(),
  refreshCreate: vi.fn(),
}));

vi.mock('@/db/connection', () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock('@/db/models', () => ({
  OAuthClient: { create: mocks.clientCreate, findOne: mocks.clientFindOne },
  OAuthCode: { findOneAndUpdate: mocks.codeFindOneAndUpdate },
  OAuthRefreshToken: {
    findOneAndUpdate: mocks.refreshFindOneAndUpdate,
    create: mocks.refreshCreate,
  },
}));

import { POST as register } from '@/app/api/oauth/register/route';
import { POST as token } from '@/app/api/oauth/token/route';
import { hashClientSecret, sha256Base64Url, verifyAccessToken } from '@/lib/oauth';

const ISSUER = 'https://recipes.example';
const REDIRECT_URI = 'cursor://anysphere.cursor-mcp/oauth/callback';
const ENV_KEYS = ['JWT_SECRET', 'OAUTH_ISSUER', 'OAUTH_REGISTRATION_SECRET'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function registerRequest(body: Record<string, unknown>): Request {
  return new Request(`${ISSUER}/api/mcp/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'Cursor', redirect_uris: [REDIRECT_URI], ...body }),
  });
}

function tokenRequest(params: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request(`${ISSUER}/api/mcp/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(params).toString(),
  });
}

beforeAll(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  process.env['JWT_SECRET'] = 'test-jwt-secret-not-real';
  process.env['OAUTH_ISSUER'] = ISSUER;
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clientCreate.mockResolvedValue({});
  mocks.refreshCreate.mockResolvedValue({});
});

describe('POST /api/oauth/register', () => {
  it('registers a public client without issuing a secret', async () => {
    const response = await register(registerRequest({ token_endpoint_auth_method: 'none' }));
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body['client_secret']).toBeUndefined();
    expect(body['client_secret_expires_at']).toBeUndefined();
    expect(body['token_endpoint_auth_method']).toBe('none');
    expect(typeof body['client_id']).toBe('string');
    expect(typeof body['client_id_issued_at']).toBe('number');
    expect(body['grant_types']).toEqual(['authorization_code', 'refresh_token']);
    expect(body['response_types']).toEqual(['code']);
    expect(mocks.clientCreate).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecretHash: null, redirectUris: [REDIRECT_URI] }),
    );
  });

  it('keeps issuing secrets to confidential clients (default method)', async () => {
    const response = await register(registerRequest({}));
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;

    expect(typeof body['client_secret']).toBe('string');
    expect(body['client_secret_expires_at']).toBe(0);
    expect(body['token_endpoint_auth_method']).toBe('client_secret_basic');
    expect(mocks.clientCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecretHash: hashClientSecret(String(body['client_secret'])),
      }),
    );
  });

  it('rejects unsupported token_endpoint_auth_method values', async () => {
    const response = await register(
      registerRequest({ token_endpoint_auth_method: 'private_key_jwt' }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['error']).toBe('invalid_client_metadata');
    expect(mocks.clientCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/oauth/token', () => {
  const userId = new Types.ObjectId();
  const scope = 'recipes:read shopping:read';

  it('exchanges an authorization code for a public client with PKCE and no secret', async () => {
    const verifier = 'a'.repeat(64);
    mocks.clientFindOne.mockResolvedValue({ clientId: 'pub', clientSecretHash: null });
    mocks.codeFindOneAndUpdate.mockResolvedValue({
      userId,
      scope,
      codeChallenge: sha256Base64Url(verifier),
    });

    const response = await token(
      tokenRequest({
        grant_type: 'authorization_code',
        client_id: 'pub',
        code: 'code-1',
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    const claims = verifyAccessToken(String(body['access_token']));
    expect(claims?.iss).toBe(ISSUER);
    expect(claims?.sub).toBe('pub');
    expect(typeof body['refresh_token']).toBe('string');
  });

  it('refreshes tokens for a public client without a secret (with rotation)', async () => {
    mocks.clientFindOne.mockResolvedValue({ clientId: 'pub', clientSecretHash: null });
    mocks.refreshFindOneAndUpdate.mockResolvedValue({ userId, scope });

    const response = await token(
      tokenRequest({ grant_type: 'refresh_token', client_id: 'pub', refresh_token: 'old-rt' }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(verifyAccessToken(String(body['access_token']))?.user_id).toBe(userId.toString());
    expect(body['refresh_token']).not.toBe('old-rt');
    expect(body['scope']).toBe(scope);
    expect(mocks.refreshCreate).toHaveBeenCalledOnce();
  });

  it('still requires the secret for confidential clients on refresh', async () => {
    mocks.clientFindOne.mockResolvedValue({
      clientId: 'conf',
      clientSecretHash: hashClientSecret('s3cret'),
    });

    const missing = await token(
      tokenRequest({ grant_type: 'refresh_token', client_id: 'conf', refresh_token: 'rt' }),
    );
    expect(missing.status).toBe(401);
    expect(mocks.refreshFindOneAndUpdate).not.toHaveBeenCalled();

    mocks.refreshFindOneAndUpdate.mockResolvedValue({ userId, scope });
    const basic = Buffer.from('conf:s3cret').toString('base64');
    const ok = await token(
      tokenRequest(
        { grant_type: 'refresh_token', refresh_token: 'rt' },
        { Authorization: `Basic ${basic}` },
      ),
    );
    expect(ok.status).toBe(200);
  });
});
