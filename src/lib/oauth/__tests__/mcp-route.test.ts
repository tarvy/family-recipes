/**
 * /mcp route auth behavior: every MCP method (including initialize) requires a
 * valid Bearer token, and every rejection carries a WWW-Authenticate challenge
 * pointing at the RFC 9728 protected-resource metadata.
 */
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/mcp/route';
import { buildWwwAuthenticate, generateAccessToken } from '@/lib/oauth';

const ISSUER = 'https://recipes.example';
const METADATA_URL = `${ISSUER}/.well-known/oauth-protected-resource/mcp`;
const ENV_KEYS = ['JWT_SECRET', 'OAUTH_ISSUER', 'MCP_AUTH_MODE', 'MCP_RESOURCE_URL'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.0.0' },
  },
};

function mcpRequest(body: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return new Request(`${ISSUER}/mcp`, { method: 'POST', headers, body: JSON.stringify(body) });
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

describe('buildWwwAuthenticate', () => {
  it('omits the error code when no token was presented', () => {
    expect(buildWwwAuthenticate(METADATA_URL)).toBe(`Bearer resource_metadata="${METADATA_URL}"`);
  });

  it('includes invalid_token when a token was rejected', () => {
    expect(buildWwwAuthenticate(METADATA_URL, 'Invalid or expired access token')).toBe(
      `Bearer error="invalid_token", error_description="Invalid or expired access token", resource_metadata="${METADATA_URL}"`,
    );
  });
});

describe('POST /mcp auth', () => {
  it.each([
    ['initialize', INITIALIZE],
    ['ping', { jsonrpc: '2.0', id: 2, method: 'ping' }],
    ['notifications/initialized', { jsonrpc: '2.0', method: 'notifications/initialized' }],
    ['tools/list', { jsonrpc: '2.0', id: 3, method: 'tools/list' }],
  ])('returns 401 + resource_metadata for %s without a token', async (_method, body) => {
    const response = await POST(mcpRequest(body));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="${METADATA_URL}"`,
    );
  });

  it('returns 401 invalid_token for initialize with a bogus token', async () => {
    const response = await POST(mcpRequest(INITIALIZE, 'bogus'));
    expect(response.status).toBe(401);
    const challenge = response.headers.get('WWW-Authenticate') ?? '';
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).toContain(`resource_metadata="${METADATA_URL}"`);
  });

  it('returns 401 for a token from a different issuer', async () => {
    process.env['OAUTH_ISSUER'] = 'https://other.example';
    const foreignToken = generateAccessToken('client', new Types.ObjectId(), 'recipes:read');
    process.env['OAUTH_ISSUER'] = ISSUER;
    const response = await POST(mcpRequest(INITIALIZE, foreignToken));
    expect(response.status).toBe(401);
  });

  it('serves initialize with a valid token', async () => {
    const token = generateAccessToken('client', new Types.ObjectId(), 'recipes:read');
    const response = await POST(mcpRequest(INITIALIZE, token));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { result?: { serverInfo?: unknown } };
    expect(payload.result?.serverInfo).toBeDefined();
  });
});
