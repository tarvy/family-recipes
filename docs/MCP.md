# MCP Server

## Overview

The MCP server exposes recipe and shopping list tools for AI agents using the Model Context Protocol (MCP). It is hosted at `/mcp` and secured via OAuth 2.1.

## Endpoint

- **URL**: `/mcp`
- **Method**: `POST`
- **Auth**: OAuth 2.1 Bearer token
- **Transport**: Streamable HTTP (JSON-only, stateless)

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes* | `Bearer <access_token>` |

*Initial handshake methods (`initialize`, `ping`) do not require authentication.

## OAuth 2.1 Authentication

The MCP server uses OAuth 2.1 with PKCE for authentication. This enables integration with Claude Desktop, Claude Code, and Cursor.

### Discovery

OAuth metadata is available at:
- `/.well-known/oauth-authorization-server`
- `/api/mcp/.well-known/oauth-authorization-server` (MCP-relative)

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/mcp/oauth/register` | Dynamic client registration |
| `/api/mcp/oauth/authorize` | Authorization (redirects to consent page) |
| `/api/mcp/oauth/token` | Token exchange and refresh |

### Flow

1. **Client Registration** (one-time):
   ```bash
   curl -X POST https://your-app.vercel.app/api/mcp/oauth/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "My App", "redirect_uris": ["http://localhost:8080/callback"]}'
   ```

2. **Authorization Request**:
   - Client redirects user to `/api/mcp/oauth/authorize` with PKCE
   - User logs in (if needed) and consents to requested scopes
   - Server redirects back with authorization code

3. **Token Exchange**:
   - Client exchanges code for access token (JWT) and refresh token
   - Access tokens expire in 1 hour
   - Refresh tokens expire in 30 days and rotate on use

### Scopes

| Scope | Description | Tools |
|-------|-------------|-------|
| `recipes:read` | Read recipes | `recipe_list`, `recipe_get`, `recipe_search`, `recipe_categories`, `ingredient_lookup` |
| `recipes:write` | Create and modify recipes | `recipe_create`, `recipe_update`, `recipe_delete` |
| `shopping:read` | View shopping lists | `shopping_list_get` |
| `shopping:write` | Create shopping lists | `shopping_list_create` |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `OAUTH_ISSUER` | Optional | OAuth issuer URL (defaults to `NEXT_PUBLIC_APP_URL`) |
| `OAUTH_REGISTRATION_SECRET` | Optional | Secret to protect client registration |
| `OWNER_EMAIL` | Optional | Default user for shopping list tools |

## Tools

### Recipes (Read)

| Tool | Scope | Description | Inputs |
|------|-------|-------------|--------|
| `recipe_list` | `recipes:read` | List recipe previews | `category?`, `limit?` |
| `recipe_get` | `recipes:read` | Fetch full recipe by slug | `slug` |
| `recipe_search` | `recipes:read` | Search recipe metadata | `query`, `cuisine?`, `course?`, `tags?`, `limit?`, `skip?` |
| `recipe_categories` | `recipes:read` | List valid recipe categories | (none) |
| `ingredient_lookup` | `recipes:read` | Find recipes by ingredient | `ingredient` |

### Recipes (Write)

| Tool | Scope | Description | Inputs |
|------|-------|-------------|--------|
| `recipe_create` | `recipes:write` | Create recipe from Cooklang | `content`, `category` |
| `recipe_update` | `recipes:write` | Update existing recipe | `slug`, `content`, `category` |
| `recipe_delete` | `recipes:write` | Delete recipe by slug | `slug` |

### Shopping Lists

| Tool | Scope | Description | Inputs |
|------|-------|-------------|--------|
| `shopping_list_create` | `shopping:write` | Create a shopping list | `name?`, `recipeSlugs`, `servingsMultipliers?`, `userEmail?` |
| `shopping_list_get` | `shopping:read` | Fetch a shopping list | `id` |

## Usage with Claude Code

```bash
claude mcp add --transport http family-recipes http://localhost:3000/mcp
```

When you first use `/mcp` in Claude Code:
1. Browser opens for authentication
2. Log in with email magic link or passkey
3. Approve requested permissions
4. Tools become available

## Example (MCP SDK Client with OAuth)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// After completing OAuth flow and obtaining access_token:
const transport = new StreamableHTTPClientTransport(
  new URL('https://your-app.vercel.app/mcp'),
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

## Security

- **PKCE S256** required for all authorization requests
- **Access tokens** are JWTs with 1-hour expiry
- **Refresh tokens** rotate on each use (30-day expiry)
- **Client secrets** are SHA-256 hashed in storage
- **Redirect URIs** must exactly match registered values
- Supports localhost, HTTPS, and custom schemes (e.g., `cursor://`)

## Notes

- The MCP endpoint is **stateless** and responds with JSON-only payloads.
- Initial handshake (`initialize`, `ping`) works without authentication.
- Tool calls require valid OAuth tokens with appropriate scopes.
- Shopping list tools default to `OWNER_EMAIL` if `userEmail` is not provided.
