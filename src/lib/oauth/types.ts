/**
 * OAuth 2.1 types and constants.
 */

import type { Types } from 'mongoose';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Time unit constants for TTL calculations */
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const REFRESH_TOKEN_TTL_DAYS = 30;

/** Access token lifetime in seconds (1 hour) */
export const ACCESS_TOKEN_TTL_SECONDS = 3600;

/** Authorization code lifetime in seconds (10 minutes) */
export const CODE_TTL_SECONDS = 600;

/** Refresh token lifetime in seconds (30 days) */
export const REFRESH_TOKEN_TTL_SECONDS =
  REFRESH_TOKEN_TTL_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

/** Client ID length */
export const CLIENT_ID_LENGTH = 21;

/** Client secret length */
export const CLIENT_SECRET_LENGTH = 32;

/** Authorization code length */
export const CODE_LENGTH = 32;

/** Refresh token length */
export const REFRESH_TOKEN_LENGTH = 32;

// -----------------------------------------------------------------------------
// Scopes
// -----------------------------------------------------------------------------

export const OAUTH_SCOPES = {
  'recipes:read': 'Read recipes, search, and lookup ingredients',
  'shopping:read': 'View shopping lists',
  'shopping:write': 'Create and modify shopping lists',
} as const;

export type OAuthScope = keyof typeof OAUTH_SCOPES;

export const VALID_SCOPES = Object.keys(OAUTH_SCOPES) as OAuthScope[];

/** Scopes required by each MCP tool */
export const TOOL_SCOPES: Record<string, OAuthScope[]> = {
  recipe_list: ['recipes:read'],
  recipe_get: ['recipes:read'],
  recipe_search: ['recipes:read'],
  ingredient_lookup: ['recipes:read'],
  shopping_list_get: ['shopping:read'],
  shopping_list_create: ['shopping:write'],
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface OAuthClientData {
  clientId: string;
  clientSecretHash?: string;
  name: string;
  redirectUris: string[];
  createdAt: Date;
}

export interface OAuthCodeData {
  code: string;
  clientId: string;
  userId: Types.ObjectId;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface OAuthRefreshTokenData {
  tokenHash: string;
  clientId: string;
  userId: Types.ObjectId;
  scope: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface AccessTokenPayload {
  sub: string; // clientId
  iss: string; // issuer
  scope: string;
  user_id: string; // MongoDB ObjectId as string
  exp: number;
  iat: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface TokenError {
  error: string;
  error_description?: string;
}

export interface AuthorizationRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
}

export interface ClientRegistrationRequest {
  client_name: string;
  redirect_uris: string[];
}

export interface ClientRegistrationResponse {
  client_id: string;
  client_secret?: string;
  client_name: string;
  redirect_uris: string[];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse and validate scope string.
 * Returns array of valid scopes, filtering out invalid ones.
 */
export function parseScopes(scopeString?: string): OAuthScope[] {
  if (!scopeString) {
    return [];
  }

  const requestedScopes = scopeString.split(' ').filter(Boolean);
  return requestedScopes.filter((s): s is OAuthScope => VALID_SCOPES.includes(s as OAuthScope));
}

/**
 * Check if all required scopes are present in granted scopes.
 */
export function hasRequiredScopes(grantedScopes: string[], requiredScopes: OAuthScope[]): boolean {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
}

/**
 * Get required scopes for a tool.
 */
export function getToolScopes(toolName: string): OAuthScope[] {
  return TOOL_SCOPES[toolName] ?? [];
}
