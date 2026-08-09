/**
 * Root-level RFC 9728 protected-resource metadata fallback.
 *
 * Some MCP client libraries fall back to the root-based well-known URI
 * when the resource-path-based one isn't discovered first. Family Recipes
 * has a single resource (`/mcp`), so this re-exports the same metadata.
 */

export const runtime = 'nodejs';

export { GET, OPTIONS } from '@/app/.well-known/oauth-protected-resource/mcp/route';
