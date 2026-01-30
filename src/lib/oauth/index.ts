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
export { buildAuthError, isAuthorizedForTool, verifyMcpAuth } from './mcp-auth';

// PKCE
export { isValidChallengeMethod, isValidVerifier, verifyCodeChallenge } from './pkce';

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
  TokenError,
  TokenResponse,
} from './types';
export {
  ACCESS_TOKEN_TTL_SECONDS,
  CLIENT_ID_LENGTH,
  CLIENT_SECRET_LENGTH,
  CODE_LENGTH,
  CODE_TTL_SECONDS,
  getToolScopes,
  hasRequiredScopes,
  OAUTH_SCOPES,
  parseScopes,
  REFRESH_TOKEN_LENGTH,
  REFRESH_TOKEN_TTL_SECONDS,
  TOOL_SCOPES,
  VALID_SCOPES,
} from './types';
