/**
 * MCP server route.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_UNAUTHORIZED,
} from '@/lib/constants/http-status';
import { logger } from '@/lib/logger';
import { type MinimalSpan, withTrace } from '@/lib/telemetry';
import { createMcpServer } from '@/mcp/server';

export const runtime = 'nodejs';

const MCP_API_KEY_HEADER = 'x-api-key';
const MCP_PATH = '/mcp';
const HTTP_OK = 200;
const HTTP_METHOD_NOT_ALLOWED = 405;
const JSON_RPC_VERSION = '2.0';
const JSON_RPC_ERROR_CODE = -32000;

interface RequestShim {
  method: string;
  url?: string;
  headers: Record<string, string>;
  body?: unknown;
  on: (event: string, handler: () => void) => void;
}

interface ResponseShim {
  statusCode: number;
  setHeader: (name: string, value: string | string[] | number) => void;
  getHeader: (name: string) => string | undefined;
  writeHead: (statusCode: number, headers?: Record<string, string | string[] | number>) => void;
  write: (chunk: string | Uint8Array) => void;
  end: (chunk?: string | Uint8Array) => void;
  json: (payload: unknown) => void;
  status: (code: number) => ResponseShim;
  on: (event: 'close', handler: () => void) => void;
}

function normalizeHeaderValue(value: string | string[] | number): string {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return String(value);
}

function createRequestShim(request: Request, body: unknown): RequestShim {
  return {
    method: request.method,
    url: MCP_PATH,
    headers: Object.fromEntries(request.headers.entries()),
    body,
    on: () => undefined,
  };
}

function createResponseShim(): { res: ResponseShim; response: Promise<Response> } {
  let currentStatusCode = HTTP_OK;
  const headers = new Headers();
  const chunks: string[] = [];
  let ended = false;
  const closeHandlers: Array<() => void> = [];

  let resolveResponse: (response: Response) => void = () => undefined;
  const responsePromise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  const finalize = () => {
    if (ended) {
      return;
    }
    ended = true;
    for (const handler of closeHandlers) {
      handler();
    }
    const body = chunks.length > 0 ? chunks.join('') : null;
    resolveResponse(new Response(body, { status: currentStatusCode, headers }));
  };

  const res: ResponseShim = {
    get statusCode() {
      return currentStatusCode;
    },
    set statusCode(code: number) {
      currentStatusCode = code;
    },
    setHeader: (name, value) => {
      headers.set(name, normalizeHeaderValue(value));
    },
    getHeader: (name) => headers.get(name) ?? undefined,
    writeHead: (code, headerMap) => {
      res.statusCode = code;
      if (headerMap) {
        for (const [key, value] of Object.entries(headerMap)) {
          headers.set(key, normalizeHeaderValue(value));
        }
      }
    },
    write: (chunk) => {
      if (typeof chunk === 'string') {
        chunks.push(chunk);
        return;
      }
      chunks.push(Buffer.from(chunk).toString('utf-8'));
    },
    end: (chunk) => {
      if (chunk) {
        res.write(chunk);
      }
      finalize();
    },
    json: (payload) => {
      headers.set('content-type', 'application/json');
      chunks.push(JSON.stringify(payload));
      finalize();
    },
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    on: (_event, handler) => {
      closeHandlers.push(handler);
    },
  };

  return { res, response: responsePromise };
}

function buildJsonRpcError(message: string) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id: null,
    error: {
      code: JSON_RPC_ERROR_CODE,
      message,
    },
  };
}

function methodNotAllowed(): Response {
  return Response.json({ error: 'method_not_allowed' }, { status: HTTP_METHOD_NOT_ALLOWED });
}

function validateMcpAuth(request: Request, span: MinimalSpan): Response | null {
  const apiKey = request.headers.get(MCP_API_KEY_HEADER);
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    logger.mcp.error('MCP_API_KEY is not configured');
    span.setAttribute('error', 'missing_api_key');
    return Response.json(
      { error: 'MCP API key is not configured' },
      { status: HTTP_INTERNAL_SERVER_ERROR },
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.mcp.warn('Unauthorized MCP request', { path: MCP_PATH });
    span.setAttribute('error', 'unauthorized');
    return Response.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED });
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
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  const server = createMcpServer();
  const { res, response } = createResponseShim();
  const req = createRequestShim(request, body);

  res.on('close', () => {
    transport.close();
  });

  // SDK transport typing uses optional callbacks which conflict with exactOptionalPropertyTypes.
  await server.connect(transport as unknown as Transport);
  await transport.handleRequest(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse,
    body,
  );

  return response;
}

async function handleMcpRequest(request: Request): Promise<Response> {
  return withTrace('mcp.request', async (span) => {
    span.setAttribute('path', MCP_PATH);
    span.setAttribute('method', request.method);

    try {
      const authResponse = validateMcpAuth(request, span);
      if (authResponse) {
        return authResponse;
      }

      logger.mcp.info('MCP request received', { path: MCP_PATH });

      const parsedBody = await parseRequestBody(request, span);
      if ('response' in parsedBody) {
        return parsedBody.response;
      }

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
