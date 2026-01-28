/**
 * MCP server bootstrap.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '@/lib/logger';
import { registerRecipeTools } from '@/mcp/tools/recipes';
import { registerShoppingTools } from '@/mcp/tools/shopping';

const MCP_SERVER_NAME = 'family-recipes-mcp';
const MCP_SERVER_VERSION = process.env.npm_package_version ?? '0.0.0';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerRecipeTools(server);
  registerShoppingTools(server);

  logger.mcp.info('MCP server initialized', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  return server;
}
