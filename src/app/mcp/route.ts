/**
 * MCP server route with OAuth 2.1 authentication.
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import {
  buildAuthError,
  isAuthorizedForTool,
  type McpAuthContext,
  verifyMcpAuth,
} from '@/lib/oauth';
import { type MinimalSpan, withTrace } from '@/lib/telemetry';
import { createMcpServer } from '@/mcp/server';

export const runtime = 'nodejs';

const MCP_PATH = '/mcp';
const HTTP_METHOD_NOT_ALLOWED = 405;
const JSON_RPC_VERSION = '2.0';
const JSON_RPC_ERROR_CODE = -32000;

/** Methods that don't require authentication */
const UNAUTHENTICATED_METHODS = new Set(['initialize', 'ping', 'notifications/initialized']);

interface JsonRpcRequest {
  jsonrpc: string;
  id?: unknown;
  method?: string;
  params?: {
    name?: string;
    [key: string]: unknown;
  };
}

function buildJsonRpcError(message: string, id: unknown = null) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: {
      code: JSON_RPC_ERROR_CODE,
      message,
    },
  };
}

function methodNotAllowed(): Response {
  return Response.json({ error: 'method_not_allowed' }, { status: HTTP_METHOD_NOT_ALLOWED });
}

/**
 * Determine if a JSON-RPC request requires authentication.
 */
function requiresAuth(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return true;
  }

  const rpcRequest = body as JsonRpcRequest;
  const method = rpcRequest.method;

  if (!method) {
    return true;
  }

  return !UNAUTHENTICATED_METHODS.has(method);
}

/**
 * Get the tool name from a tools/call request.
 */
function getToolName(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const rpcRequest = body as JsonRpcRequest;
  if (rpcRequest.method !== 'tools/call') {
    return null;
  }

  return rpcRequest.params?.name ?? null;
}

/**
 * Validate OAuth authentication for MCP request.
 */
function validateMcpOAuth(
  request: Request,
  body: unknown,
  span: MinimalSpan,
): { error: Response | null; context: McpAuthContext | null } {
  const needsAuth = requiresAuth(body);
  const authResult = verifyMcpAuth(request, { required: needsAuth });

  if (!authResult.authenticated) {
    if (needsAuth) {
      logger.mcp.warn('Unauthorized MCP request', {
        path: MCP_PATH,
        error: authResult.error,
      });
      span.setAttribute('error', 'unauthorized');

      const rpcRequest = body as JsonRpcRequest | undefined;
      return {
        error: Response.json(buildAuthError(authResult.error, rpcRequest?.id), {
          status: HTTP_UNAUTHORIZED,
        }),
        context: null,
      };
    }
    // Auth not required and not provided - that's fine
    return { error: null, context: null };
  }

  span.setAttribute('client_id', authResult.context.clientId);
  span.setAttribute('user_id', authResult.context.userId);

  return { error: null, context: authResult.context };
}

/**
 * Validate tool authorization based on scopes.
 */
function validateToolAuth(
  body: unknown,
  context: McpAuthContext | null,
  span: MinimalSpan,
): Response | null {
  const toolName = getToolName(body);
  if (!toolName) {
    // Not a tool call, no additional auth needed
    return null;
  }

  span.setAttribute('tool', toolName);

  if (!isAuthorizedForTool(context, toolName)) {
    logger.mcp.warn('Insufficient scopes for tool', {
      tool: toolName,
      clientId: context?.clientId,
    });
    span.setAttribute('error', 'forbidden');

    const rpcRequest = body as JsonRpcRequest | undefined;
    return Response.json(
      buildAuthError(`Insufficient scopes for tool: ${toolName}`, rpcRequest?.id),
      { status: HTTP_FORBIDDEN },
    );
  }

  return null;
}

async function parseRequestBody(
  request: Request,
  span: MinimalSpan,
): Promise<{ body: unknown } | { response: Response }> {
  try {
    const body = await request.json();
    return { body };
  } catch (error) {
    logger.mcp.warn('Invalid MCP JSON payload', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    span.setAttribute('error', 'invalid_json');
    return {
      response: Response.json(buildJsonRpcError('Invalid JSON payload'), {
        status: HTTP_BAD_REQUEST,
      }),
    };
  }
}

async function executeMcpTransport(request: Request, body: unknown): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  const server = createMcpServer();

  // SDK transport typing uses optional callbacks which conflict with exactOptionalPropertyTypes.
  await server.connect(transport as unknown as Transport);

  return transport.handleRequest(request, { parsedBody: body });
}

async function handleMcpRequest(request: Request): Promise<Response> {
  return withTrace('mcp.request', async (span) => {
    span.setAttribute('path', MCP_PATH);
    span.setAttribute('method', request.method);

    try {
      // Parse body first (needed for auth decisions)
      const parsedBody = await parseRequestBody(request, span);
      if ('response' in parsedBody) {
        return parsedBody.response;
      }

      // Validate OAuth authentication
      const { error: authError, context } = validateMcpOAuth(request, parsedBody.body, span);
      if (authError) {
        return authError;
      }

      // Validate tool authorization if it's a tool call
      const toolAuthError = validateToolAuth(parsedBody.body, context, span);
      if (toolAuthError) {
        return toolAuthError;
      }

      logger.mcp.info('MCP request received', {
        path: MCP_PATH,
        clientId: context?.clientId,
      });

      return executeMcpTransport(request, parsedBody.body);
    } catch (error) {
      logger.mcp.error('MCP request failed', error instanceof Error ? error : undefined);
      span.setAttribute('error', error instanceof Error ? error.message : 'unknown');
      return Response.json({ error: 'MCP request failed' }, { status: HTTP_INTERNAL_SERVER_ERROR });
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export async function GET(): Promise<Response> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed();
}
