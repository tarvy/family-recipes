/**
 * MCP server route with OAuth 2.1 authentication.
 *
 * Every MCP request - including `initialize`, `ping`, and notifications -
 * requires a valid Bearer access token. Missing, invalid, or expired tokens
 * always get a 401 with `WWW-Authenticate: Bearer resource_metadata="..."`
 * (RFC 9728 §5.1) so MCP clients consistently (re)start OAuth instead of
 * believing the connection is authenticated after a 200 `initialize` and then
 * failing on `tools/list`.
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
  buildProtectedResourceMetadataUrl,
  buildWwwAuthenticate,
  getMcpResourceUrl,
  getOAuthIssuer,
  isAuthorizedForTool,
  type McpAuthContext,
  verifyMcpAuth,
} from '@/lib/oauth';
import { type MinimalSpan, withTrace } from '@/lib/telemetry';
import { createMcpServer } from '@/mcp/server';

export const runtime = 'nodejs';

const MCP_PATH = '/mcp';
const WWW_AUTHENTICATE_HEADER = 'WWW-Authenticate';
const HTTP_METHOD_NOT_ALLOWED = 405;
const JSON_RPC_VERSION = '2.0';
const JSON_RPC_ERROR_CODE = -32000;

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
 * Resolve this deployment's `/mcp` resource URL from the same source as the
 * protected-resource metadata route (`MCP_RESOURCE_URL` in mcp-auth mode,
 * otherwise `{OAUTH_ISSUER}/mcp`), so the advertised `resource_metadata` URL
 * always matches the `resource` that metadata document declares.
 */
function mcpResourceUrl(request: Request): string {
  const configured = getMcpResourceUrl();
  if (configured) {
    return configured;
  }
  try {
    return `${getOAuthIssuer()}${MCP_PATH}`;
  } catch {
    return new URL(MCP_PATH, request.url).toString();
  }
}

/**
 * Build a 401 response advertising the protected-resource metadata URL so
 * MCP clients (re)discover the authorization server and start OAuth.
 */
function unauthorizedResponse(
  request: Request,
  tokenPresented: boolean,
  message: string,
): Response {
  const metadataUrl = buildProtectedResourceMetadataUrl(mcpResourceUrl(request));
  return Response.json(buildAuthError(message, null), {
    status: HTTP_UNAUTHORIZED,
    headers: {
      [WWW_AUTHENTICATE_HEADER]: buildWwwAuthenticate(
        metadataUrl,
        tokenPresented ? message : undefined,
      ),
    },
  });
}

/**
 * Validate OAuth authentication for an MCP request. Required for every
 * method; runs before the body is parsed so requests without a valid token
 * always get the 401 challenge.
 */
async function validateMcpOAuth(
  request: Request,
  span: MinimalSpan,
): Promise<{ error: Response } | { context: McpAuthContext }> {
  const authResult = await verifyMcpAuth(request, { required: true });

  if (!authResult.authenticated) {
    const tokenPresented = request.headers.has('Authorization');
    logger.mcp.warn('Unauthorized MCP request', {
      path: MCP_PATH,
      error: authResult.error,
      tokenPresented,
    });
    span.setAttribute('error', 'unauthorized');
    return { error: unauthorizedResponse(request, tokenPresented, authResult.error) };
  }

  span.setAttribute('client_id', authResult.context.clientId);
  span.setAttribute('user_id', authResult.context.userId);

  return { context: authResult.context };
}

/**
 * Validate tool authorization based on scopes.
 */
function validateToolAuth(
  body: unknown,
  context: McpAuthContext,
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
      clientId: context.clientId,
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
      // Every MCP method (including initialize/ping) requires a valid token
      const auth = await validateMcpOAuth(request, span);
      if ('error' in auth) {
        return auth.error;
      }
      const { context } = auth;

      const parsedBody = await parseRequestBody(request, span);
      if ('response' in parsedBody) {
        return parsedBody.response;
      }

      // Validate tool authorization if it's a tool call
      const toolAuthError = validateToolAuth(parsedBody.body, context, span);
      if (toolAuthError) {
        return toolAuthError;
      }

      logger.mcp.info('MCP request received', {
        path: MCP_PATH,
        clientId: context.clientId,
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
