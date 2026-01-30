/**
 * MCP OAuth authentication wrapper.
 *
 * Provides middleware for verifying OAuth Bearer tokens on MCP requests.
 */

import { getToolScopes, hasRequiredScopes, verifyAccessToken } from './';

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
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Verify OAuth Bearer token from request.
 *
 * @param request - The incoming request
 * @param options - Authentication options
 * @returns Authentication result with context or error
 */
export function verifyMcpAuth(
  request: Request,
  options: { required?: boolean } = {},
): McpAuthResult {
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

  // Verify token
  const payload = verifyAccessToken(token);
  if (!payload) {
    return { authenticated: false, error: 'Invalid or expired access token' };
  }

  const context: McpAuthContext = {
    clientId: payload.sub,
    userId: payload.user_id,
    scopes: payload.scope.split(' '),
  };

  return { authenticated: true, context };
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
      code: -32000,
      message,
    },
  };
}
