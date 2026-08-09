/**
 * MCP-relative protected-resource metadata re-export.
 * Required for MCP client discovery at /api/mcp/.well-known/oauth-protected-resource
 */

export const runtime = 'nodejs';

export { GET, OPTIONS } from '@/app/.well-known/oauth-protected-resource/mcp/route';
