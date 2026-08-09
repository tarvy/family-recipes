/**
 * MCP resource-server verification against the standalone mcp-auth plane.
 *
 * Family Recipes' MCP endpoint (`/mcp`) is a protected resource (RFC 8707).
 * In `mcp-auth` mode, access tokens are RS256 JWTs issued by a dedicated
 * authorization server (`https://auth.tarvy.dev` by default) and verified
 * here against that issuer's JWKS with audience/resource binding to this
 * app's own resource URL. `legacy` mode keeps the original HS256
 * self-issued verification (see `./tokens`) as a rollback path.
 *
 * See docs/MCP.md for the full migration/rollback story.
 */

import {
  createLocalJWKSet,
  createRemoteJWKSet,
  type JWK,
  type JWTVerifyGetKey,
  errors as joseErrors,
  jwtVerify,
} from 'jose';

/** Auth mode for MCP resource-server verification. */
export type McpAuthMode = 'mcp-auth' | 'legacy';

/** Claims extracted from a verified mcp-auth access token. */
export interface McpAuthTokenClaims {
  clientId: string;
  userId: string;
  scopes: string[];
}

/** RFC 9728 OAuth 2.0 Protected Resource Metadata. */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
  resource_name: string;
}

/** Default mcp-auth issuer per the frozen tarvy.dev edge contract. */
const DEFAULT_MCP_AUTH_ISSUER = 'https://auth.tarvy.dev';

/** Well-known JWKS path appended to an issuer's base URL. */
const JWKS_PATH = '/.well-known/jwks.json';

let cachedRemoteJwks: { issuer: string; jwksUri: string; keySet: JWTVerifyGetKey } | null = null;

/**
 * Resolve the mcp-auth issuer URL. Always resolves to a value (defaults to
 * the frozen `auth.tarvy.dev` issuer) so `mcp-auth` mode never requires
 * additional configuration beyond `MCP_RESOURCE_URL`.
 */
export function getMcpAuthIssuer(): string {
  return (process.env['MCP_AUTH_ISSUER_URL'] ?? DEFAULT_MCP_AUTH_ISSUER).replace(/\/$/, '');
}

/**
 * Resolve the resource URL this deployment presents to mcp-auth. Unset by
 * default (no baked-in default) - operators must explicitly choose the
 * current Vercel URL during transition, or `https://recipes.tarvy.dev/mcp`
 * once DNS/hosting is ready. See docs/MCP.md.
 */
export function getMcpResourceUrl(): string | undefined {
  const value = process.env['MCP_RESOURCE_URL'];
  return value ? value.replace(/\/$/, '') : undefined;
}

/**
 * Resolve which verification path is active. `MCP_AUTH_MODE` can force
 * either mode explicitly; otherwise mode is inferred from the presence of
 * `MCP_RESOURCE_URL` so existing deployments keep today's behavior
 * (`legacy`) until an operator opts in.
 */
export function resolveMcpAuthMode(): McpAuthMode {
  const explicit = process.env['MCP_AUTH_MODE'];
  if (explicit === 'mcp-auth' || explicit === 'legacy') {
    return explicit;
  }
  return getMcpResourceUrl() ? 'mcp-auth' : 'legacy';
}

/**
 * Resolve the JWKS URI for an issuer, honoring an explicit override.
 */
function getJwksUri(issuer: string): string {
  return process.env['MCP_AUTH_JWKS_URI'] ?? `${issuer}${JWKS_PATH}`;
}

/**
 * Get (and cache) a remote JWKS key resolver for the given issuer. Cached
 * per-issuer so repeated verifications reuse `jose`'s own cooldown/cache
 * behavior instead of re-fetching on every request.
 */
function getRemoteKeySet(issuer: string): JWTVerifyGetKey {
  const jwksUri = getJwksUri(issuer);
  if (
    !cachedRemoteJwks ||
    cachedRemoteJwks.issuer !== issuer ||
    cachedRemoteJwks.jwksUri !== jwksUri
  ) {
    cachedRemoteJwks = { issuer, jwksUri, keySet: createRemoteJWKSet(new URL(jwksUri)) };
  }
  return cachedRemoteJwks.keySet;
}

/**
 * Build a local (non-network) JWKS key resolver from raw JWKs. Exposed for
 * tests so the exact `jwtVerify` code path used in production can be
 * exercised without a network dependency.
 */
export function buildLocalKeySet(keys: JWK[]): JWTVerifyGetKey {
  return createLocalJWKSet({ keys });
}

/**
 * Verify an mcp-auth-issued RS256 access token against the configured
 * issuer/resource, returning normalized claims or `null` for any failure
 * (invalid signature, wrong issuer, wrong audience/resource, expired,
 * malformed). Never throws.
 */
export async function verifyMcpAuthResourceToken(
  token: string,
  options: { keySet?: JWTVerifyGetKey } = {},
): Promise<McpAuthTokenClaims | null> {
  const issuer = getMcpAuthIssuer();
  const resource = getMcpResourceUrl();
  if (!resource) {
    return null;
  }

  const keySet = options.keySet ?? getRemoteKeySet(issuer);

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer,
      audience: resource,
    });

    const resourceClaim = payload['resource'];
    if (typeof resourceClaim === 'string' && resourceClaim.replace(/\/$/, '') !== resource) {
      return null;
    }

    const scopeClaim = payload['scope'];
    if (typeof scopeClaim !== 'string') {
      return null;
    }

    const subject = payload.sub;
    if (typeof subject !== 'string') {
      return null;
    }

    const clientIdClaim = payload['client_id'];
    const clientId = typeof clientIdClaim === 'string' ? clientIdClaim : subject;

    return {
      clientId,
      userId: subject,
      scopes: scopeClaim.split(' ').filter(Boolean),
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      return null;
    }
    throw error;
  }
}

/**
 * Build RFC 9728 protected-resource metadata for the currently configured
 * mode. In `legacy` mode this self-describes (resource = this app's own
 * `/mcp`, authorization server = this app's own OAuth AS) so discovery
 * keeps working through the transition window.
 */
export function buildProtectedResourceMetadata(options: {
  selfIssuer: string;
  selfResourceUrl: string;
  scopesSupported: string[];
}): ProtectedResourceMetadata {
  const mode = resolveMcpAuthMode();
  const resource =
    mode === 'mcp-auth'
      ? (getMcpResourceUrl() ?? options.selfResourceUrl)
      : options.selfResourceUrl;
  const authorizationServer = mode === 'mcp-auth' ? getMcpAuthIssuer() : options.selfIssuer;

  return {
    resource,
    authorization_servers: [authorizationServer],
    scopes_supported: options.scopesSupported,
    bearer_methods_supported: ['header'],
    resource_name: 'Family Recipes MCP',
  };
}

/**
 * Build the RFC 9728 well-known metadata URL for a resource URL, inserting
 * `/.well-known/oauth-protected-resource` between the host and the
 * resource's own path (per RFC 9728 §3.1).
 */
export function buildProtectedResourceMetadataUrl(resourceUrl: string): string {
  const parsed = new URL(resourceUrl);
  const resourcePath = parsed.pathname === '/' ? '' : parsed.pathname;
  return `${parsed.origin}/.well-known/oauth-protected-resource${resourcePath}`;
}
