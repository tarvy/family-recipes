import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildLocalKeySet,
  buildProtectedResourceMetadata,
  buildProtectedResourceMetadataUrl,
  getMcpAuthIssuer,
  getMcpResourceUrl,
  resolveMcpAuthMode,
  verifyMcpAuthResourceToken,
} from '../resource-server';

const ISSUER = 'https://auth.tarvy.dev';
const RESOURCE = 'https://recipes.tarvy.dev/mcp';
const OTHER_RESOURCE = 'https://mail.tarvy.dev/mcp';

const ENV_KEYS = [
  'MCP_AUTH_MODE',
  'MCP_RESOURCE_URL',
  'MCP_AUTH_ISSUER_URL',
  'MCP_AUTH_JWKS_URI',
] as const;

function resetEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

async function signToken(options: {
  privateKey: CryptoKey;
  kid: string;
  issuer?: string;
  audience?: string;
  resource?: string;
  scope?: string;
  sub?: string;
  clientId?: string;
  expiresIn?: string;
}): Promise<string> {
  const jwt = new SignJWT({
    scope: options.scope ?? 'recipes:read shopping:read',
    resource: options.resource ?? RESOURCE,
    client_id: options.clientId ?? 'test-client',
  })
    .setProtectedHeader({ alg: 'RS256', kid: options.kid })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? RESOURCE)
    .setSubject(options.sub ?? 'user@example.com')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h');

  return jwt.sign(options.privateKey);
}

describe('resolveMcpAuthMode', () => {
  beforeEach(resetEnv);

  it('defaults to legacy when no env is set', () => {
    expect(resolveMcpAuthMode()).toBe('legacy');
  });

  it('infers mcp-auth when MCP_RESOURCE_URL is set', () => {
    process.env['MCP_RESOURCE_URL'] = RESOURCE;
    expect(resolveMcpAuthMode()).toBe('mcp-auth');
  });

  it('honors an explicit MCP_AUTH_MODE=legacy override', () => {
    process.env['MCP_RESOURCE_URL'] = RESOURCE;
    process.env['MCP_AUTH_MODE'] = 'legacy';
    expect(resolveMcpAuthMode()).toBe('legacy');
  });

  it('honors an explicit MCP_AUTH_MODE=mcp-auth override', () => {
    process.env['MCP_AUTH_MODE'] = 'mcp-auth';
    expect(resolveMcpAuthMode()).toBe('mcp-auth');
  });
});

describe('getMcpAuthIssuer / getMcpResourceUrl', () => {
  beforeEach(resetEnv);

  it('defaults the issuer to auth.tarvy.dev', () => {
    expect(getMcpAuthIssuer()).toBe('https://auth.tarvy.dev');
  });

  it('strips a trailing slash from an overridden issuer', () => {
    process.env['MCP_AUTH_ISSUER_URL'] = 'https://auth.example.com/';
    expect(getMcpAuthIssuer()).toBe('https://auth.example.com');
  });

  it('returns undefined when MCP_RESOURCE_URL is unset', () => {
    expect(getMcpResourceUrl()).toBeUndefined();
  });

  it('strips a trailing slash from the resource URL', () => {
    process.env['MCP_RESOURCE_URL'] = `${RESOURCE}/`;
    expect(getMcpResourceUrl()).toBe(RESOURCE);
  });
});

describe('verifyMcpAuthResourceToken', () => {
  let privateKey: CryptoKey;
  let keySet: ReturnType<typeof buildLocalKeySet>;
  const kid = 'test-key-1';

  beforeEach(async () => {
    resetEnv();
    process.env['MCP_RESOURCE_URL'] = RESOURCE;

    const { publicKey, privateKey: generatedPrivateKey } = await generateKeyPair('RS256', {
      extractable: true,
    });
    privateKey = generatedPrivateKey;
    const jwk = await exportJWK(publicKey);
    keySet = buildLocalKeySet([{ ...jwk, kid, alg: 'RS256' }]);
  });

  it('accepts a well-formed mcp-auth token for this resource', async () => {
    const token = await signToken({ privateKey, kid });
    const claims = await verifyMcpAuthResourceToken(token, { keySet });

    expect(claims).toEqual({
      clientId: 'test-client',
      userId: 'user@example.com',
      scopes: ['recipes:read', 'shopping:read'],
    });
  });

  it('rejects a token issued for a different resource (audience isolation)', async () => {
    const mailToken = await signToken({
      privateKey,
      kid,
      audience: OTHER_RESOURCE,
      resource: OTHER_RESOURCE,
      scope: 'mail:read',
    });

    const claims = await verifyMcpAuthResourceToken(mailToken, { keySet });
    expect(claims).toBeNull();
  });

  it('rejects a token from an unexpected issuer', async () => {
    const token = await signToken({ privateKey, kid, issuer: 'https://not-mcp-auth.example.com' });
    const claims = await verifyMcpAuthResourceToken(token, { keySet });
    expect(claims).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ privateKey, kid, expiresIn: '-1h' });
    const claims = await verifyMcpAuthResourceToken(token, { keySet });
    expect(claims).toBeNull();
  });

  it('rejects a malformed token', async () => {
    const claims = await verifyMcpAuthResourceToken('not-a-jwt', { keySet });
    expect(claims).toBeNull();
  });

  it('rejects a token missing a scope claim', async () => {
    const jwt = new SignJWT({ resource: RESOURCE })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuer(ISSUER)
      .setAudience(RESOURCE)
      .setSubject('user@example.com')
      .setIssuedAt()
      .setExpirationTime('1h');
    const token = await jwt.sign(privateKey);

    const claims = await verifyMcpAuthResourceToken(token, { keySet });
    expect(claims).toBeNull();
  });

  it('returns null when MCP_RESOURCE_URL is not configured', async () => {
    process.env['MCP_RESOURCE_URL'] = undefined;
    const token = await signToken({ privateKey, kid });
    const claims = await verifyMcpAuthResourceToken(token, { keySet });
    expect(claims).toBeNull();
  });
});

describe('buildProtectedResourceMetadata', () => {
  beforeEach(resetEnv);

  const scopesSupported = ['recipes:read', 'recipes:write', 'shopping:read', 'shopping:write'];

  it('points at mcp-auth when in mcp-auth mode', () => {
    process.env['MCP_RESOURCE_URL'] = RESOURCE;

    const metadata = buildProtectedResourceMetadata({
      selfIssuer: 'https://recipes-legacy.example.com',
      selfResourceUrl: 'https://recipes-legacy.example.com/mcp',
      scopesSupported,
    });

    expect(metadata).toEqual({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      scopes_supported: scopesSupported,
      bearer_methods_supported: ['header'],
      resource_name: 'Family Recipes MCP',
    });
  });

  it('self-describes when in legacy mode', () => {
    const metadata = buildProtectedResourceMetadata({
      selfIssuer: 'https://recipes-legacy.example.com',
      selfResourceUrl: 'https://recipes-legacy.example.com/mcp',
      scopesSupported,
    });

    expect(metadata.resource).toBe('https://recipes-legacy.example.com/mcp');
    expect(metadata.authorization_servers).toEqual(['https://recipes-legacy.example.com']);
  });

  it('never advertises mail scopes', () => {
    const metadata = buildProtectedResourceMetadata({
      selfIssuer: 'https://recipes-legacy.example.com',
      selfResourceUrl: 'https://recipes-legacy.example.com/mcp',
      scopesSupported,
    });

    expect(metadata.scopes_supported).not.toContain('mail:read');
    expect(metadata.scopes_supported).not.toContain('mail:write');
  });
});

describe('buildProtectedResourceMetadataUrl', () => {
  it('inserts the well-known path between origin and resource path', () => {
    expect(buildProtectedResourceMetadataUrl(RESOURCE)).toBe(
      'https://recipes.tarvy.dev/.well-known/oauth-protected-resource/mcp',
    );
  });

  it('handles a bare origin (root path) resource', () => {
    expect(buildProtectedResourceMetadataUrl('https://recipes.tarvy.dev')).toBe(
      'https://recipes.tarvy.dev/.well-known/oauth-protected-resource',
    );
  });
});
