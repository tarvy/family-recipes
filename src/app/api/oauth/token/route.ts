/**
 * OAuth 2.0 Token Endpoint
 *
 * Handles:
 * - authorization_code grant (with PKCE verification)
 * - refresh_token grant (with rotation)
 */

import { connectDB } from '@/db/connection';
import { OAuthClient, OAuthCode, OAuthRefreshToken } from '@/db/models';
import {
  HTTP_BAD_REQUEST,
  HTTP_NO_CONTENT,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  type TokenError,
  type TokenResponse,
  verifyClientSecret,
  verifyCodeChallenge,
} from '@/lib/oauth';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const MS_PER_SECOND = 1000;

/** Basic auth prefix and its length */
const BASIC_AUTH_PREFIX = 'Basic ';
const BASIC_AUTH_PREFIX_LENGTH = BASIC_AUTH_PREFIX.length;

/** CORS headers for OAuth endpoints */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

function errorResponse(error: string, description: string, status: number): Response {
  const body: TokenError = { error, error_description: description };
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function tokenResponse(response: TokenResponse): Response {
  return Response.json(response, { status: HTTP_OK, headers: CORS_HEADERS });
}

/**
 * Extract client credentials from Authorization header or body.
 */
function extractClientCredentials(
  request: Request,
  body: Record<string, string>,
): { clientId: string | null; clientSecret: string | null } {
  // Try Authorization header first (Basic auth)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith(BASIC_AUTH_PREFIX)) {
    const encoded = authHeader.slice(BASIC_AUTH_PREFIX_LENGTH);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [id, secret] = decoded.split(':');
    if (id) {
      return { clientId: id, clientSecret: secret ?? null };
    }
  }

  // Fall back to body parameters
  return {
    clientId: body['client_id'] ?? null,
    clientSecret: body['client_secret'] ?? null,
  };
}

/**
 * Parse URL-encoded form body.
 */
async function parseFormBody(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Handle authorization_code grant.
 */
async function handleAuthorizationCodeGrant(
  clientId: string,
  client: { clientSecretHash?: string | null },
  clientSecret: string | null,
  body: Record<string, string>,
): Promise<Response> {
  const code = body['code'];
  const redirectUri = body['redirect_uri'];
  const codeVerifier = body['code_verifier'];

  if (!(code && redirectUri && codeVerifier)) {
    return errorResponse(
      'invalid_request',
      'code, redirect_uri, and code_verifier are required',
      HTTP_BAD_REQUEST,
    );
  }

  // Verify client secret if client has one
  if (client.clientSecretHash) {
    if (!(clientSecret && verifyClientSecret(clientSecret, client.clientSecretHash))) {
      return errorResponse('invalid_client', 'Invalid client credentials', HTTP_UNAUTHORIZED);
    }
  }

  // Find and validate authorization code (atomic update to prevent reuse)
  await connectDB();
  const oauthCode = await OAuthCode.findOneAndUpdate(
    {
      code,
      clientId,
      redirectUri,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { usedAt: new Date() },
    { new: false },
  );

  if (!oauthCode) {
    return errorResponse(
      'invalid_grant',
      'Invalid or expired authorization code',
      HTTP_BAD_REQUEST,
    );
  }

  // Verify PKCE
  if (!verifyCodeChallenge(codeVerifier, oauthCode.codeChallenge)) {
    return errorResponse('invalid_grant', 'Invalid code_verifier', HTTP_BAD_REQUEST);
  }

  // Generate tokens
  const accessToken = generateAccessToken(clientId, oauthCode.userId, oauthCode.scope);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Store refresh token
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * MS_PER_SECOND);
  await OAuthRefreshToken.create({
    tokenHash: refreshTokenHash,
    clientId,
    userId: oauthCode.userId,
    scope: oauthCode.scope,
    expiresAt: refreshExpiresAt,
  });

  logger.auth.info('OAuth tokens issued via authorization_code', {
    clientId,
    userId: oauthCode.userId.toString(),
  });

  return tokenResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: oauthCode.scope,
  });
}

/**
 * Handle refresh_token grant with rotation.
 */
async function handleRefreshTokenGrant(
  clientId: string,
  client: { clientSecretHash?: string | null },
  clientSecret: string | null,
  body: Record<string, string>,
): Promise<Response> {
  const refreshToken = body['refresh_token'];

  if (!refreshToken) {
    return errorResponse('invalid_request', 'refresh_token is required', HTTP_BAD_REQUEST);
  }

  // Verify client secret if client has one
  if (client.clientSecretHash) {
    if (!(clientSecret && verifyClientSecret(clientSecret, client.clientSecretHash))) {
      return errorResponse('invalid_client', 'Invalid client credentials', HTTP_UNAUTHORIZED);
    }
  }

  // Find and revoke old refresh token (atomic update)
  await connectDB();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const oldToken = await OAuthRefreshToken.findOneAndUpdate(
    {
      tokenHash: refreshTokenHash,
      clientId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { revokedAt: new Date() },
    { new: false },
  );

  if (!oldToken) {
    return errorResponse('invalid_grant', 'Invalid or expired refresh token', HTTP_BAD_REQUEST);
  }

  // Generate new tokens
  const accessToken = generateAccessToken(clientId, oldToken.userId, oldToken.scope);
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  // Store new refresh token
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * MS_PER_SECOND);
  await OAuthRefreshToken.create({
    tokenHash: newRefreshTokenHash,
    clientId,
    userId: oldToken.userId,
    scope: oldToken.scope,
    expiresAt: refreshExpiresAt,
  });

  logger.auth.info('OAuth tokens refreshed', {
    clientId,
    userId: oldToken.userId.toString(),
  });

  return tokenResponse({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: newRefreshToken,
    scope: oldToken.scope,
  });
}

export async function POST(request: Request): Promise<Response> {
  return withTrace('oauth.token', async (span) => {
    span.setAttribute('path', '/api/oauth/token');

    let body: Record<string, string>;
    try {
      body = await parseFormBody(request);
    } catch {
      span.setAttribute('error', 'invalid_body');
      return errorResponse('invalid_request', 'Invalid request body', HTTP_BAD_REQUEST);
    }

    const grantType = body['grant_type'];
    if (!grantType) {
      span.setAttribute('error', 'missing_grant_type');
      return errorResponse('invalid_request', 'grant_type is required', HTTP_BAD_REQUEST);
    }

    const { clientId, clientSecret } = extractClientCredentials(request, body);
    if (!clientId) {
      span.setAttribute('error', 'missing_client_id');
      return errorResponse('invalid_request', 'client_id is required', HTTP_BAD_REQUEST);
    }

    span.setAttribute('client_id', clientId);
    span.setAttribute('grant_type', grantType);

    // Validate client exists
    await connectDB();
    const client = await OAuthClient.findOne({ clientId });

    if (!client) {
      span.setAttribute('error', 'invalid_client');
      return errorResponse('invalid_client', 'Unknown client', HTTP_UNAUTHORIZED);
    }

    switch (grantType) {
      case 'authorization_code':
        return handleAuthorizationCodeGrant(clientId, client, clientSecret, body);

      case 'refresh_token':
        return handleRefreshTokenGrant(clientId, client, clientSecret, body);

      default:
        span.setAttribute('error', 'unsupported_grant_type');
        return errorResponse(
          'unsupported_grant_type',
          `Unsupported grant_type: ${grantType}`,
          HTTP_BAD_REQUEST,
        );
    }
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: HTTP_NO_CONTENT,
    headers: CORS_HEADERS,
  });
}
