/**
 * MCP Server Bootstrap
 *
 * Purpose: Initialize and configure the MCP server with tools and instructions.
 *
 * Scope: Creates and exports the MCP server factory function used by the HTTP transport.
 *
 * Overview:
 * This module bootstraps the Family Recipes MCP server by:
 * 1. Defining server metadata (name, version)
 * 2. Providing comprehensive instructions about Cooklang format for AI clients
 * 3. Registering recipe and shopping list tools
 *
 * Dependencies:
 * - @modelcontextprotocol/sdk: MCP server implementation
 * - @/lib/logger: Structured logging
 * - @/mcp/tools/recipes: Recipe-related MCP tools
 * - @/mcp/tools/shopping: Shopping list MCP tools
 *
 * Exports:
 * - createMcpServer(): Factory function that creates a configured McpServer instance
 *
 * Props/Interfaces: N/A (no React components or complex interfaces)
 *
 * State/Behavior:
 * - Stateless factory function
 * - Server instance manages its own connection state
 * - Tools are registered once at creation time
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { COOKLANG_GUIDE } from '@/lib/cooklang/guide';
import { logger } from '@/lib/logger';
import { registerMenuTools } from '@/mcp/tools/menu';
import { registerRecipeTools } from '@/mcp/tools/recipes';
import { registerShoppingTools } from '@/mcp/tools/shopping';

const MCP_SERVER_NAME = 'family-recipes-mcp';
const MCP_SERVER_VERSION = process.env.npm_package_version ?? '0.0.0';

/**
 * MCP server instructions for AI clients.
 * Provides context about Cooklang format and how to work with recipes.
 */
const MCP_INSTRUCTIONS = `# Family Recipes MCP Server

This server provides access to a family recipe collection and its weekly
meal-plan menus. Recipes are stored in a database; Cooklang is the markup
language used when reading and writing recipe content.

${COOKLANG_GUIDE}

## Recipe Organization

Each recipe has a category:
- \`breakfast\` - Breakfast items
- \`cocktails\` - Cocktails and drinks
- \`desserts\` - Desserts
- \`entrees\` - Main dishes
- \`salads\` - Salads
- \`sides\` - Side dishes
- \`soups\` - Soups and stews

## Working with Recipes

- Use \`recipe_list\` to browse available recipes
- Use \`recipe_get\` to fetch full recipe details by slug
- Use \`recipe_search\` to search by title, description, or tags
- Use \`ingredient_lookup\` to find recipes containing a specific ingredient
- Use \`shopping_list_create\` to generate a shopping list from recipe slugs
- Use \`shopping_list_get\` to fetch a shopping list by id

## Meal Planning

Weekly menus schedule recipes onto days of the week and can be finalized into a
shopping list. Weeks use ISO labels like \`2026-W35\`; omit the label for the
current week. A menu moves through \`building\` → \`survey-sent\` → \`locked-in\`.

- Use \`menu_get_week\` to view (or create) a week's menu and see assignment ids
- Use \`menu_add_dinner\` to add a recipe by slug to a day (defaults to dinner)
- Use \`menu_remove_assignment\` to remove a recipe by its assignmentId
- Use \`menu_send_survey\` to open family voting (required before finalizing)
- Use \`menu_finalize\` to lock in the plan and generate its shopping list

## Tips

- Recipe slugs are URL-friendly versions of titles (e.g., "lemon-chicken-and-orzo-soup")
- Times are in minutes when returned from the API
- Ingredient quantities may be fractions (0.5, 0.25) or whole numbers

## Writing Recipes

- Use \`recipe_categories\` to get valid category names before creating recipes
- Use \`recipe_create\` to create new recipes (requires \`recipes:write\` scope)
- Use \`recipe_update\` to modify existing recipes (requires \`recipes:write\` scope)
- Input is raw Cooklang content - the AI should generate valid Cooklang format
`;

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      instructions: MCP_INSTRUCTIONS,
    },
  );

  registerRecipeTools(server);
  registerShoppingTools(server);
  registerMenuTools(server);

  logger.mcp.info('MCP server initialized', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  return server;
}
