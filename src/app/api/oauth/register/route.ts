/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Allows MCP clients to register themselves. Honors
 * `token_endpoint_auth_method`:
 * - `none` registers a public client: no `client_secret` is issued, PKCE is
 *   required at /authorize (as for every client), and the token endpoint
 *   accepts `authorization_code` / `refresh_token` grants without a secret.
 * - `client_secret_basic` (RFC 7591 default) / `client_secret_post` register
 *   a confidential client with a hashed secret, exactly as before.
 */

import { connectDB } from '@/db/connection';
import { OAuthClient } from '@/db/models';
import {
  HTTP_BAD_REQUEST,
  HTTP_CREATED,
  HTTP_NO_CONTENT,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import {
  type ClientRegistrationRequest,
  type ClientRegistrationResponse,
  DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD,
  generateClientId,
  generateClientSecret,
  hashClientSecret,
  isTokenEndpointAuthMethod,
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
  type TokenEndpointAuthMethod,
} from '@/lib/oauth';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const MS_PER_SECOND = 1000;

/** RFC 7591 `client_secret_expires_at` value meaning "never expires". */
const CLIENT_SECRET_NEVER_EXPIRES = 0;

/** CORS headers for OAuth endpoints */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Validate redirect URI format.
 * Allows:
 * - HTTPS URLs
 * - Localhost HTTP (127.0.0.1 or localhost)
 * - Custom schemes (cursor://, vscode://)
 */
function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);

    // Allow HTTPS
    if (parsed.protocol === 'https:') {
      return true;
    }

    // Allow localhost HTTP
    if (parsed.protocol === 'http:') {
      const hostname = parsed.hostname.toLowerCase();
      return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    // Allow custom schemes (cursor://, vscode://, etc.)
    if (parsed.protocol.endsWith(':') && !parsed.protocol.startsWith('http')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function isValidRegistrationRequest(
  body: unknown,
): body is ClientRegistrationRequest & { client_name: string; redirect_uris: string[] } {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const record = body as Record<string, unknown>;

  if (typeof record['client_name'] !== 'string' || !record['client_name'].trim()) {
    return false;
  }

  if (!Array.isArray(record['redirect_uris']) || record['redirect_uris'].length === 0) {
    return false;
  }

  return record['redirect_uris'].every(
    (uri: unknown) => typeof uri === 'string' && isValidRedirectUri(uri),
  );
}

/**
 * Resolve the requested token endpoint auth method, defaulting per RFC 7591.
 * Returns null for unsupported values.
 */
function resolveAuthMethod(body: ClientRegistrationRequest): TokenEndpointAuthMethod | null {
  const requested = body.token_endpoint_auth_method;
  if (requested === undefined) {
    return DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD;
  }
  return isTokenEndpointAuthMethod(requested) ? requested : null;
}

/**
 * Persist a new client and build its RFC 7591 registration response. Public
 * clients (`none`) get no secret; confidential clients get a secret that is
 * stored only as a hash.
 */
async function createClientRegistration(
  body: ClientRegistrationRequest,
  authMethod: TokenEndpointAuthMethod,
): Promise<ClientRegistrationResponse> {
  await connectDB();

  const clientId = generateClientId();
  const clientSecret = authMethod === 'none' ? null : generateClientSecret();
  const issuedAt = Math.floor(Date.now() / MS_PER_SECOND);

  await OAuthClient.create({
    clientId,
    clientSecretHash: clientSecret ? hashClientSecret(clientSecret) : null,
    name: body.client_name.trim(),
    redirectUris: body.redirect_uris,
  });

  logger.auth.info('OAuth client registered', {
    clientId,
    name: body.client_name,
    redirectUriCount: body.redirect_uris.length,
    tokenEndpointAuthMethod: authMethod,
  });

  const response: ClientRegistrationResponse = {
    client_id: clientId,
    client_id_issued_at: issuedAt,
    client_name: body.client_name,
    redirect_uris: body.redirect_uris,
    token_endpoint_auth_method: authMethod,
    grant_types: SUPPORTED_GRANT_TYPES,
    response_types: SUPPORTED_RESPONSE_TYPES,
  };
  if (clientSecret) {
    response.client_secret = clientSecret;
    response.client_secret_expires_at = CLIENT_SECRET_NEVER_EXPIRES;
  }
  return response;
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: HTTP_NO_CONTENT,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request): Promise<Response> {
  return withTrace('oauth.register', async (span) => {
    span.setAttribute('path', '/api/oauth/register');

    // Check for optional registration secret
    const registrationSecret = process.env.OAUTH_REGISTRATION_SECRET;
    if (registrationSecret) {
      const authHeader = request.headers.get('Authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== registrationSecret) {
        logger.auth.warn('Unauthorized client registration attempt');
        span.setAttribute('error', 'unauthorized');
        return Response.json(
          { error: 'unauthorized', error_description: 'Invalid registration secret' },
          { status: HTTP_UNAUTHORIZED, headers: CORS_HEADERS },
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      span.setAttribute('error', 'invalid_json');
      return Response.json(
        { error: 'invalid_request', error_description: 'Invalid JSON body' },
        { status: HTTP_BAD_REQUEST, headers: CORS_HEADERS },
      );
    }

    if (!isValidRegistrationRequest(body)) {
      span.setAttribute('error', 'invalid_request');
      return Response.json(
        {
          error: 'invalid_request',
          error_description: 'client_name and valid redirect_uris are required',
        },
        { status: HTTP_BAD_REQUEST, headers: CORS_HEADERS },
      );
    }

    const authMethod = resolveAuthMethod(body);
    if (!authMethod) {
      span.setAttribute('error', 'invalid_client_metadata');
      return Response.json(
        {
          error: 'invalid_client_metadata',
          error_description: 'Unsupported token_endpoint_auth_method',
        },
        { status: HTTP_BAD_REQUEST, headers: CORS_HEADERS },
      );
    }

    const response = await createClientRegistration(body, authMethod);
    span.setAttribute('client_id', response.client_id);
    span.setAttribute('token_endpoint_auth_method', authMethod);

    return Response.json(response, {
      status: HTTP_CREATED,
      headers: CORS_HEADERS,
    });
  });
}
