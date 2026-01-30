/**
 * MCP-relative OAuth metadata re-export.
 * Required for MCP client discovery at /api/mcp/.well-known/oauth-authorization-server
 */

export const runtime = 'nodejs';

export { GET } from '@/app/.well-known/oauth-authorization-server/route';
