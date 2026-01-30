/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * Allows MCP clients to register themselves.
 */

import { connectDB } from '@/db/connection';
import { OAuthClient } from '@/db/models';
import { HTTP_BAD_REQUEST, HTTP_CREATED, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import {
  type ClientRegistrationRequest,
  type ClientRegistrationResponse,
  generateClientId,
  generateClientSecret,
  hashClientSecret,
} from '@/lib/oauth';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

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

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
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

    await connectDB();

    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = hashClientSecret(clientSecret);

    await OAuthClient.create({
      clientId,
      clientSecretHash,
      name: body.client_name.trim(),
      redirectUris: body.redirect_uris,
    });

    logger.auth.info('OAuth client registered', {
      clientId,
      name: body.client_name,
      redirectUriCount: body.redirect_uris.length,
    });

    span.setAttribute('client_id', clientId);

    const response: ClientRegistrationResponse = {
      client_id: clientId,
      client_secret: clientSecret,
      client_name: body.client_name,
      redirect_uris: body.redirect_uris,
    };

    return Response.json(response, {
      status: HTTP_CREATED,
      headers: CORS_HEADERS,
    });
  });
}
