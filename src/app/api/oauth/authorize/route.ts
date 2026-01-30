/**
 * OAuth 2.0 Authorization Endpoint
 *
 * Handles authorization requests by:
 * 1. Validating client and redirect_uri
 * 2. Redirecting to /authorize for user consent
 * 3. POST receives consent approval and issues authorization code
 */

import { connectDB } from '@/db/connection';
import { OAuthClient, OAuthCode } from '@/db/models';
import { getSessionFromRequest, validateSession } from '@/lib/auth';
import { HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED } from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import {
  CODE_TTL_SECONDS,
  generateAuthorizationCode,
  getOAuthIssuer,
  isValidChallengeMethod,
  parseScopes,
  VALID_SCOPES,
} from '@/lib/oauth';
import type { MinimalSpan } from '@/lib/telemetry';
import { withTrace } from '@/lib/telemetry';

export const runtime = 'nodejs';

const MS_PER_SECOND = 1000;

/** CORS headers for OAuth endpoints */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Raw params from URL (all nullable). */
interface RawAuthorizeParams {
  responseType: string | null;
  clientId: string | null;
  redirectUri: string | null;
  scope: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

/** Validated params after pre-redirect checks (clientId/redirectUri confirmed). */
interface ValidatedPreRedirectParams {
  clientId: string;
  redirectUri: string;
  responseType: string | null;
  scope: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}

/** Fully validated params ready for consent redirect. */
interface ValidatedAuthorizeParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  state: string | null;
}

function buildJsonError(error: string, description: string, status: number): Response {
  return Response.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS },
  );
}

function buildErrorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state?: string,
): Response {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  url.searchParams.set('error_description', description);
  if (state) {
    url.searchParams.set('state', state);
  }
  return Response.redirect(url.toString(), 302);
}

function buildSuccessRedirect(redirectUri: string, code: string, state?: string): Response {
  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) {
    url.searchParams.set('state', state);
  }
  return Response.redirect(url.toString(), 302);
}

/**
 * Validate pre-redirect parameters (client_id, redirect_uri, client existence).
 * Returns validated params if successful, or error response if validation fails.
 */
async function validatePreRedirectParams(
  params: RawAuthorizeParams,
  span: MinimalSpan,
): Promise<{ validated: ValidatedPreRedirectParams } | { error: Response }> {
  const { clientId, redirectUri } = params;

  if (!(clientId && redirectUri)) {
    span.setAttribute('error', 'missing_params');
    return {
      error: buildJsonError(
        'invalid_request',
        'client_id and redirect_uri are required',
        HTTP_BAD_REQUEST,
      ),
    };
  }

  await connectDB();
  const client = await OAuthClient.findOne({ clientId });

  if (!client) {
    span.setAttribute('error', 'invalid_client');
    return { error: buildJsonError('invalid_client', 'Unknown client', HTTP_BAD_REQUEST) };
  }

  if (!client.redirectUris.includes(redirectUri)) {
    span.setAttribute('error', 'invalid_redirect_uri');
    return { error: buildJsonError('invalid_request', 'Invalid redirect_uri', HTTP_BAD_REQUEST) };
  }

  return {
    validated: {
      clientId,
      redirectUri,
      responseType: params.responseType,
      scope: params.scope,
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    },
  };
}

/**
 * Validate PKCE and response_type parameters (after redirect_uri is validated).
 * Returns fully validated params if successful, or error redirect if validation fails.
 */
function validatePkceParams(
  params: ValidatedPreRedirectParams,
): { validated: ValidatedAuthorizeParams } | { error: Response } {
  const { responseType, redirectUri, state, codeChallenge, codeChallengeMethod, clientId, scope } =
    params;

  if (responseType !== 'code') {
    return {
      error: buildErrorRedirect(
        redirectUri,
        'unsupported_response_type',
        'Only code response_type is supported',
        state ?? undefined,
      ),
    };
  }

  if (!(codeChallenge && codeChallengeMethod)) {
    return {
      error: buildErrorRedirect(
        redirectUri,
        'invalid_request',
        'PKCE code_challenge and code_challenge_method are required',
        state ?? undefined,
      ),
    };
  }

  if (!isValidChallengeMethod(codeChallengeMethod)) {
    return {
      error: buildErrorRedirect(
        redirectUri,
        'invalid_request',
        'Only S256 code_challenge_method is supported',
        state ?? undefined,
      ),
    };
  }

  // Parse and validate scopes
  const requestedScopes = parseScopes(scope ?? '');
  if (requestedScopes.length === 0) {
    requestedScopes.push(...VALID_SCOPES);
  }

  return {
    validated: {
      clientId,
      redirectUri,
      scope: requestedScopes.join(' '),
      codeChallenge,
      state,
    },
  };
}

/**
 * Build the consent page redirect URL.
 */
function buildConsentRedirect(params: ValidatedAuthorizeParams): Response {
  const issuer = getOAuthIssuer();
  const consentUrl = new URL('/authorize', issuer);
  consentUrl.searchParams.set('client_id', params.clientId);
  consentUrl.searchParams.set('redirect_uri', params.redirectUri);
  consentUrl.searchParams.set('scope', params.scope);
  consentUrl.searchParams.set('code_challenge', params.codeChallenge);
  if (params.state) {
    consentUrl.searchParams.set('state', params.state);
  }
  return Response.redirect(consentUrl.toString(), 302);
}

/**
 * GET /api/oauth/authorize
 *
 * Initial authorization request - validates parameters and redirects to consent page.
 */
export async function GET(request: Request): Promise<Response> {
  return withTrace('oauth.authorize.get', async (span) => {
    span.setAttribute('path', '/api/oauth/authorize');

    const url = new URL(request.url);
    const rawParams: RawAuthorizeParams = {
      responseType: url.searchParams.get('response_type'),
      clientId: url.searchParams.get('client_id'),
      redirectUri: url.searchParams.get('redirect_uri'),
      scope: url.searchParams.get('scope'),
      state: url.searchParams.get('state'),
      codeChallenge: url.searchParams.get('code_challenge'),
      codeChallengeMethod: url.searchParams.get('code_challenge_method'),
    };

    // Validate pre-redirect parameters
    const preRedirectResult = await validatePreRedirectParams(rawParams, span);
    if ('error' in preRedirectResult) {
      return preRedirectResult.error;
    }

    // Validate PKCE parameters (can now redirect errors)
    const pkceResult = validatePkceParams(preRedirectResult.validated);
    if ('error' in pkceResult) {
      return pkceResult.error;
    }

    const validatedParams = pkceResult.validated;
    span.setAttribute('client_id', validatedParams.clientId);
    span.setAttribute('scope', validatedParams.scope);

    logger.auth.info('OAuth authorization request', {
      clientId: validatedParams.clientId,
      scopes: validatedParams.scope.split(' '),
    });

    return buildConsentRedirect(validatedParams);
  });
}

interface ConsentFormData {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  state: string | null;
  action: string | null;
}

/**
 * Validate user session for POST request.
 */
async function validateUserSession(
  request: Request,
  span: MinimalSpan,
): Promise<{ user: { id: string } } | { error: Response }> {
  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) {
    span.setAttribute('error', 'no_session');
    return { error: buildJsonError('unauthorized', 'Not authenticated', HTTP_UNAUTHORIZED) };
  }

  const sessionResult = await validateSession(sessionToken);
  if (!(sessionResult.valid && sessionResult.user)) {
    span.setAttribute('error', 'invalid_session');
    return { error: buildJsonError('unauthorized', 'Invalid session', HTTP_UNAUTHORIZED) };
  }

  return { user: sessionResult.user };
}

/**
 * Parse and validate form data from consent submission.
 */
async function parseConsentForm(
  request: Request,
  span: MinimalSpan,
): Promise<ConsentFormData | { error: Response }> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    span.setAttribute('error', 'invalid_form');
    return { error: buildJsonError('invalid_request', 'Invalid form data', HTTP_BAD_REQUEST) };
  }

  const clientId = formData.get('client_id') as string | null;
  const redirectUri = formData.get('redirect_uri') as string | null;
  const scope = formData.get('scope') as string | null;
  const codeChallenge = formData.get('code_challenge') as string | null;

  if (!(clientId && redirectUri && scope && codeChallenge)) {
    span.setAttribute('error', 'missing_form_fields');
    return {
      error: buildJsonError('invalid_request', 'Missing required form fields', HTTP_BAD_REQUEST),
    };
  }

  return {
    clientId,
    redirectUri,
    scope,
    codeChallenge,
    state: formData.get('state') as string | null,
    action: formData.get('action') as string | null,
  };
}

/**
 * Issue authorization code and redirect to client.
 */
async function issueAuthorizationCode(
  form: ConsentFormData,
  userId: string,
  span: MinimalSpan,
): Promise<Response> {
  const code = generateAuthorizationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * MS_PER_SECOND);

  await OAuthCode.create({
    code,
    clientId: form.clientId,
    userId,
    redirectUri: form.redirectUri,
    scope: form.scope,
    codeChallenge: form.codeChallenge,
    expiresAt,
  });

  logger.auth.info('OAuth authorization code issued', {
    clientId: form.clientId,
    userId,
    scopes: form.scope,
  });

  span.setAttribute('client_id', form.clientId);
  span.setAttribute('user_id', userId);

  return buildSuccessRedirect(form.redirectUri, code, form.state ?? undefined);
}

/**
 * POST /api/oauth/authorize
 *
 * Consent form submission - issues authorization code after user approval.
 */
export async function POST(request: Request): Promise<Response> {
  return withTrace('oauth.authorize.post', async (span) => {
    span.setAttribute('path', '/api/oauth/authorize');

    // Validate user session
    const sessionResult = await validateUserSession(request, span);
    if ('error' in sessionResult) {
      return sessionResult.error;
    }

    // Parse form data
    const formResult = await parseConsentForm(request, span);
    if ('error' in formResult) {
      return formResult.error;
    }

    // Validate client and redirect_uri
    await connectDB();
    const client = await OAuthClient.findOne({ clientId: formResult.clientId });

    if (!client?.redirectUris.includes(formResult.redirectUri)) {
      span.setAttribute('error', 'invalid_client');
      return buildJsonError('invalid_client', 'Invalid client or redirect_uri', HTTP_BAD_REQUEST);
    }

    // Handle denial
    if (formResult.action !== 'approve') {
      logger.auth.info('OAuth authorization denied', {
        clientId: formResult.clientId,
        userId: sessionResult.user.id,
      });
      return buildErrorRedirect(
        formResult.redirectUri,
        'access_denied',
        'User denied the authorization request',
        formResult.state ?? undefined,
      );
    }

    // Issue authorization code
    return issueAuthorizationCode(formResult, sessionResult.user.id, span);
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
