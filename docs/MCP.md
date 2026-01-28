# MCP Server

## Overview

The MCP server exposes recipe and shopping list tools for AI agents using the Model Context Protocol (MCP). It is hosted at `/mcp` and secured via an API key.

## Endpoint

- **URL**: `/mcp`
- **Method**: `POST`
- **Auth**: `x-api-key` header (value from `MCP_API_KEY`)
- **Transport**: Streamable HTTP (JSON-only, stateless)

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | MCP API key from environment |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MCP_API_KEY` | Yes | API key for MCP requests |
| `OWNER_EMAIL` | Optional | Default user for shopping list tools |

## Tools

### Recipes

| Tool | Description | Inputs |
|------|-------------|--------|
| `recipe_list` | List recipe previews | `category?`, `limit?` |
| `recipe_get` | Fetch full recipe by slug | `slug` |
| `recipe_search` | Search recipe metadata | `query`, `cuisine?`, `course?`, `tags?`, `limit?`, `skip?` |
| `ingredient_lookup` | Find recipes by ingredient | `ingredient` |

### Shopping Lists

| Tool | Description | Inputs |
|------|-------------|--------|
| `shopping_list_create` | Create a shopping list | `name?`, `recipeSlugs`, `servingsMultipliers?`, `userEmail?` |
| `shopping_list_get` | Fetch a shopping list | `id` |

## Example (MCP SDK Client)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('https://your-app.vercel.app/mcp'),
  {
    headers: {
      'x-api-key': process.env.MCP_API_KEY as string,
    },
  },
);

const client = new Client({ name: 'recipe-client', version: '1.0.0' });
await client.connect(transport);

const tools = await client.listTools();
const recipe = await client.callTool({
  name: 'recipe_get',
  arguments: { slug: 'beef-stroganoff' },
});

console.log(tools.tools.length, recipe.structuredContent);
await client.close();
```

## Notes

- The MCP endpoint is **stateless** and responds with JSON-only payloads.
- Requests without a valid API key return `401`.
- Shopping list tools default to `OWNER_EMAIL` if `userEmail` is not provided.
