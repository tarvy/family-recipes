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
import { logger } from '@/lib/logger';
import { registerRecipeTools } from '@/mcp/tools/recipes';
import { registerShoppingTools } from '@/mcp/tools/shopping';

const MCP_SERVER_NAME = 'family-recipes-mcp';
const MCP_SERVER_VERSION = process.env.npm_package_version ?? '0.0.0';

/**
 * MCP server instructions for AI clients.
 * Provides context about Cooklang format and how to work with recipes.
 */
const MCP_INSTRUCTIONS = `# Family Recipes MCP Server

This server provides access to a family recipe collection stored in Cooklang format.

## Cooklang Format

Recipes are written in Cooklang, a markup language for recipes. Here's how it works:

### Metadata (at top of file)
\`\`\`
>> title: Recipe Name
>> servings: 4
>> prep time: 15 minutes
>> cook time: 30 minutes
>> total time: 45 minutes
>> source: https://example.com/recipe
>> description: A brief description of the dish
>> cuisine: Italian
>> course: dinner
>> tags: quick, weeknight, vegetarian
\`\`\`

### Ingredients
Ingredients are marked with \`@\` followed by the name and optional quantity/unit in braces:
- \`@chicken breast{2%lbs}\` → 2 lbs chicken breast
- \`@olive oil{3%tbsp}\` → 3 tbsp olive oil
- \`@garlic{4%cloves}\` → 4 cloves garlic
- \`@onion{1}\` → 1 onion (no unit needed)
- \`@salt and pepper{}\` → salt and pepper to taste (no quantity)

### Cookware
Cookware is marked with \`#\`:
- \`#large skillet{}\` → large skillet
- \`#baking sheet{2}\` → 2 baking sheets

### Timers
Timers use \`~\`:
- \`~{15%minutes}\` → 15 minutes
- \`~{2%hours}\` → 2 hours

### Steps
Steps are written as regular paragraphs. Ingredients, cookware, and timers are embedded inline:

\`\`\`
Heat @olive oil{2%tbsp} in a #large skillet{} over medium heat. Add @chicken breast{1%lb}
and cook for ~{5%minutes} per side until golden brown.
\`\`\`

## Recipe Organization

Recipes are organized by category in folders:
- \`entrees/\` - Main dishes
- \`sides/\` - Side dishes
- \`soups/\` - Soups and stews
- \`salads/\` - Salads
- \`desserts/\` - Desserts
- \`breakfast/\` - Breakfast items

## Working with Recipes

- Use \`recipe_list\` to browse available recipes
- Use \`recipe_get\` to fetch full recipe details by slug
- Use \`recipe_search\` to search by title, description, or tags
- Use \`ingredient_lookup\` to find recipes containing a specific ingredient
- Use \`shopping_list_create\` to generate a shopping list from recipe slugs

## Tips

- Recipe slugs are URL-friendly versions of titles (e.g., "lemon-chicken-and-orzo-soup")
- Times are in minutes when returned from the API
- Ingredient quantities may be fractions (0.5, 0.25) or whole numbers
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

  logger.mcp.info('MCP server initialized', {
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  return server;
}
