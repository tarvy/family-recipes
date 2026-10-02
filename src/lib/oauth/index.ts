/**
 * OAuth 2.1 module exports.
 *
 * Usage:
 *   import {
 *     generateAccessToken,
 *     verifyAccessToken,
 *     verifyCodeChallenge,
 *     OAUTH_SCOPES,
 *   } from '@/lib/oauth';
 */

// Crypto utilities
export { generateSecureToken, sha256Base64Url, sha256Hex, timingSafeEqual } from './crypto';
// MCP authentication
export type { McpAuthContext, McpAuthResult } from './mcp-auth';
export {
  buildAuthError,
  buildWwwAuthenticate,
  isAuthorizedForTool,
  verifyMcpAuth,
} from './mcp-auth';

// PKCE
export { isValidChallengeMethod, isValidVerifier, verifyCodeChallenge } from './pkce';

// mcp-auth resource-server verification (RS256/JWKS) + rollback mode
export type { McpAuthMode, McpAuthTokenClaims, ProtectedResourceMetadata } from './resource-server';
export {
  buildLocalKeySet,
  buildProtectedResourceMetadata,
  buildProtectedResourceMetadataUrl,
  getMcpAuthIssuer,
  getMcpResourceUrl,
  resolveMcpAuthMode,
  verifyMcpAuthResourceToken,
} from './resource-server';

// Token management
export {
  generateAccessToken,
  generateAuthorizationCode,
  generateClientId,
  generateClientSecret,
  generateRefreshToken,
  getOAuthIssuer,
  hashClientSecret,
  hashRefreshToken,
  verifyAccessToken,
  verifyClientSecret,
} from './tokens';
// Types and constants
export type {
  AccessTokenPayload,
  AuthorizationRequest,
  ClientRegistrationRequest,
  ClientRegistrationResponse,
  OAuthClientData,
  OAuthCodeData,
  OAuthRefreshTokenData,
  OAuthScope,
  TokenEndpointAuthMethod,
  TokenError,
  TokenResponse,
} from './types';
export {
  ACCESS_TOKEN_TTL_SECONDS,
  CLIENT_ID_LENGTH,
  CLIENT_SECRET_LENGTH,
  CODE_LENGTH,
  CODE_TTL_SECONDS,
  DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD,
  getToolScopes,
  hasRequiredScopes,
  isTokenEndpointAuthMethod,
  OAUTH_SCOPES,
  parseScopes,
  REFRESH_TOKEN_LENGTH,
  REFRESH_TOKEN_TTL_SECONDS,
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
  TOKEN_ENDPOINT_AUTH_METHODS,
  TOOL_SCOPES,
  VALID_SCOPES,
} from './types';
