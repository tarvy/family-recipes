/**
 * MCP OAuth authentication wrapper.
 *
 * Provides middleware for verifying OAuth Bearer tokens on MCP requests.
 * Dispatches to either the mcp-auth RS256/JWKS resource-server path or the
 * legacy self-issued HS256 path depending on `resolveMcpAuthMode()`.
 */

import { getToolScopes, hasRequiredScopes, verifyAccessToken } from './';
import { resolveMcpAuthMode, verifyMcpAuthResourceToken } from './resource-server';

/** Bearer auth prefix and its length */
const BEARER_PREFIX = 'Bearer ';
const BEARER_PREFIX_LENGTH = 7;

/** JSON-RPC error code for auth failures */
const JSONRPC_AUTH_ERROR_CODE = -32000;

/**
 * Authenticated user context from OAuth token.
 */
export interface McpAuthContext {
  clientId: string;
  userId: string;
  scopes: string[];
}

/**
 * Result of MCP authentication.
 */
export type McpAuthResult =
  | { authenticated: true; context: McpAuthContext }
  | { authenticated: false; error: string };

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return authHeader.slice(BEARER_PREFIX_LENGTH);
}

/**
 * Verify OAuth Bearer token from request.
 *
 * @param request - The incoming request
 * @param options - Authentication options
 * @returns Authentication result with context or error
 */
export async function verifyMcpAuth(
  request: Request,
  options: { required?: boolean } = {},
): Promise<McpAuthResult> {
  const { required = true } = options;

  const token = extractBearerToken(request);

  // No token provided
  if (!token) {
    if (required) {
      return { authenticated: false, error: 'Missing Authorization header' };
    }
    // For optional auth, return unauthenticated without error
    return { authenticated: false, error: '' };
  }

  const context =
    resolveMcpAuthMode() === 'mcp-auth'
      ? await verifyMcpAuthResourceToken(token)
      : verifyLegacyToken(token);

  if (!context) {
    return { authenticated: false, error: 'Invalid or expired access token' };
  }

  return { authenticated: true, context };
}

/**
 * Verify a legacy self-issued HS256 access token (rollback path).
 */
function verifyLegacyToken(token: string): McpAuthContext | null {
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  return {
    clientId: payload.sub,
    userId: payload.user_id,
    scopes: payload.scope.split(' '),
  };
}

/**
 * Check if authentication context has required scopes for a tool.
 *
 * @param context - Authentication context (or null for unauthenticated)
 * @param toolName - Name of the MCP tool being called
 * @returns true if authorized, false otherwise
 */
export function isAuthorizedForTool(context: McpAuthContext | null, toolName: string): boolean {
  // If no context, check if tool requires auth
  const requiredScopes = getToolScopes(toolName);

  // Tool has no scope requirements (public)
  if (requiredScopes.length === 0) {
    return true;
  }

  // Tool requires scopes but no auth context
  if (!context) {
    return false;
  }

  // Check if context has required scopes
  return hasRequiredScopes(context.scopes, requiredScopes);
}

/**
 * Build JSON-RPC error response for auth failures.
 */
export function buildAuthError(message: string, id: unknown = null): object {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: JSONRPC_AUTH_ERROR_CODE,
      message,
    },
  };
}
