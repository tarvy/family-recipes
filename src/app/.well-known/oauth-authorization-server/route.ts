/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * Provides discovery endpoint for OAuth clients.
 */

import { getOAuthIssuer, OAUTH_SCOPES } from '@/lib/oauth';

export const runtime = 'nodejs';

const CACHE_MAX_AGE = 3600; // 1 hour

function buildMetadata(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    registration_endpoint: `${issuer}/api/mcp/oauth/register`,
    scopes_supported: Object.keys(OAUTH_SCOPES),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
  };
}

export async function GET(): Promise<Response> {
  const issuer = getOAuthIssuer();
  const metadata = buildMetadata(issuer);

  return Response.json(metadata, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
