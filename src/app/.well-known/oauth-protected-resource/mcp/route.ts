/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the `/mcp` resource.
 *
 * Points MCP clients at the active authorization server: mcp-auth
 * (`https://auth.tarvy.dev` by default) once `MCP_RESOURCE_URL` is
 * configured, or this app's own OAuth AS during the legacy rollback path.
 */

import { HTTP_NO_CONTENT } from '@/lib/constants/http-status';
import { buildProtectedResourceMetadata, getOAuthIssuer, OAUTH_SCOPES } from '@/lib/oauth';

export const runtime = 'nodejs';

const CACHE_MAX_AGE = 3600; // 1 hour

export async function GET(): Promise<Response> {
  const metadata = buildProtectedResourceMetadata({
    selfIssuer: getOAuthIssuer(),
    selfResourceUrl: `${getOAuthIssuer()}/mcp`,
    scopesSupported: Object.keys(OAUTH_SCOPES),
  });

  return Response.json(metadata, {
    headers: {
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: HTTP_NO_CONTENT,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}
