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

RFC 9728 protected-resource metadata (used by MCP clients to discover which
authorization server to use for `/mcp`) is available at:
- `/.well-known/oauth-protected-resource/mcp` (canonical)
- `/.well-known/oauth-protected-resource` (root fallback)
- `/api/mcp/.well-known/oauth-protected-resource` (MCP-relative)

Its `authorization_servers` field points to mcp-auth in `mcp-auth` mode, or
Family Recipes' own AS in `legacy` mode. See
[mcp-auth Resource Migration](#mcp-auth-resource-migration).

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
| `menu:read` | View weekly meal-plan menus | `menu_get_week` |
| `menu:write` | Build and finalize weekly menus | `menu_add_dinner`, `menu_remove_assignment`, `menu_send_survey`, `menu_finalize` |

> **Note**: `mail:read`/`mail:write` were temporarily recognized by this
> authorization server (PR-059) to delegate a token to the separately hosted
> Newt MCP resource server during Newt's migration off Family Recipes' HS256
> tokens. Newt now issues its own tokens via `mcp-auth`, so those scopes have
> been removed here (PR-060). See [mcp-auth Resource Migration](#mcp-auth-resource-migration)
> below.

## mcp-auth Resource Migration

Family Recipes' `/mcp` endpoint can be verified in two modes, controlled by
`MCP_AUTH_MODE` (see [Environment](#environment)):

- **`mcp-auth`** (target state): access tokens are RS256 JWTs issued by the
  standalone [`mcp-auth`](https://auth.tarvy.dev) authorization server.
  Family Recipes verifies them against that issuer's JWKS with audience
  binding to this app's own resource URL (`MCP_RESOURCE_URL`). Family Recipes
  is registered with mcp-auth as an independent resource
  (`https://recipes.tarvy.dev/mcp`) with its own `recipes:*`/`shopping:*`
  scopes; Newt is a separate mcp-auth resource with its own `mail:*` scopes.
  Revoking one resource's grants (in mcp-auth or in each app's own consent UI)
  does not affect the other.
- **`legacy`** (rollback): Family Recipes acts as its own OAuth 2.1
  authorization server exactly as before this migration - self-issued HS256
  access tokens, local `/api/mcp/oauth/{register,authorize,token}` endpoints,
  and the `/authorize` consent page. This path is unchanged code and remains
  available for rollback.

Mode resolution (`resolveMcpAuthMode()` in `src/lib/oauth/resource-server.ts`):

1. If `MCP_AUTH_MODE` is set to `mcp-auth` or `legacy`, that value wins.
2. Otherwise, `mcp-auth` mode is inferred automatically once `MCP_RESOURCE_URL`
   is set; without it, the deployment stays in `legacy` mode (today's
   behavior, no config changes required).

**Important**: this migration only affects MCP resource-server verification
for `/mcp`. It does **not** touch web application login. Magic links,
passkeys, and browser sessions (`src/lib/auth/session.ts`) are opaque,
database-backed tokens unrelated to `JWT_SECRET`/OAuth and are unaffected in
either mode.

### Registering Family Recipes with mcp-auth (operator steps)

1. Confirm DNS/hosting for `https://recipes.tarvy.dev` (or, during
   transition, use the current Vercel app URL + `/mcp`).
2. Register the resource with mcp-auth using
   [`examples/seed-recipes-resource.json`](../examples/seed-recipes-resource.json)
   as the payload (see the `mcp-auth` repo's resource-registration docs for
   the exact CLI/API call).
3. Set on the Family Recipes deployment:
   - `MCP_RESOURCE_URL=https://recipes.tarvy.dev/mcp` (or the transitional
     Vercel URL + `/mcp`)
   - `MCP_AUTH_ISSUER_URL` only if not using the default
     (`https://auth.tarvy.dev`)
   - Leave `MCP_AUTH_MODE` unset to auto-infer `mcp-auth`, or set it
     explicitly.
4. Verify: `curl https://recipes.tarvy.dev/.well-known/oauth-protected-resource/mcp`
   returns `authorization_servers: ["https://auth.tarvy.dev"]` (or your
   configured issuer).
5. Have an MCP client complete the mcp-auth authorization flow and confirm
   `recipe_list` (or another tool) succeeds.

### Rollback

Set `MCP_AUTH_MODE=legacy` (or unset `MCP_RESOURCE_URL`) and redeploy. Family
Recipes immediately reverts to self-issued HS256 tokens and its own OAuth AS
endpoints - no code changes, no data migration, and no impact on existing web
sessions.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (in `legacy` mode) | Secret for signing self-issued access tokens |
| `OAUTH_ISSUER` | Optional | OAuth issuer URL (defaults to `NEXT_PUBLIC_APP_URL`); also the `legacy`-mode protected-resource issuer |
| `OAUTH_REGISTRATION_SECRET` | Optional | Secret to protect client registration |
| `OWNER_EMAIL` | Optional | Default user for shopping list tools |
| `MCP_AUTH_MODE` | Optional | `mcp-auth` or `legacy`. Defaults to `mcp-auth` when `MCP_RESOURCE_URL` is set, otherwise `legacy` |
| `MCP_RESOURCE_URL` | Required for `mcp-auth` mode | This deployment's resource URL as registered with mcp-auth, e.g. `https://recipes.tarvy.dev/mcp` |
| `MCP_AUTH_ISSUER_URL` | Optional | mcp-auth issuer base URL (defaults to `https://auth.tarvy.dev`) |
| `MCP_AUTH_JWKS_URI` | Optional | Override the JWKS URI (defaults to `{MCP_AUTH_ISSUER_URL}/.well-known/jwks.json`) |

## Making MCP Operable

This section provides a step-by-step checklist to get MCP working with Cursor or Claude Code.

### 1. Required environment

Ensure these are set in `.env.local` (or Vercel environment variables):

- **`JWT_SECRET`** — Required. Used to sign OAuth access tokens. Generate with `openssl rand -base64 48`.
- **`NEXT_PUBLIC_APP_URL`** — Required. Base URL of the app (e.g. `http://localhost:3000` for dev, or `https://your-app.vercel.app` for production).
- **App dependencies** — MongoDB, Resend (for magic links), etc. must be configured so MCP tools (recipes, shopping lists) can run.

### 2. Optional MCP variables

| Variable | Purpose |
|----------|---------|
| `OAUTH_ISSUER` | Override OAuth issuer URL (defaults to `NEXT_PUBLIC_APP_URL`) |
| `OAUTH_REGISTRATION_SECRET` | Protects the client registration endpoint from unauthorized use |
| `OWNER_EMAIL` | Default user for shopping list tools when `userEmail` is not provided |

### 3. OAuth client registration (one-time)

Register an OAuth client for Cursor or Claude Code. They typically use a localhost callback (e.g. `http://localhost:8080/callback` or similar).

```bash
curl -X POST https://your-app.vercel.app/api/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Cursor",
    "redirect_uris": ["http://localhost:8080/callback"]
  }'
```

Response includes `client_id` and `client_secret`. Store these; you will configure the MCP client with them.

For **local development**, use `http://localhost:3000` as the base URL:

```bash
curl -X POST http://localhost:3000/api/mcp/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Cursor", "redirect_uris": ["http://localhost:8080/callback"]}'
```

### 4. Client configuration

- **MCP endpoint**: `{NEXT_PUBLIC_APP_URL}/mcp` (e.g. `http://localhost:3000/mcp` or `https://your-app.vercel.app/mcp`)
- **Auth**: OAuth 2.1 with PKCE
- **Discovery**: `/.well-known/oauth-authorization-server` or `/api/mcp/.well-known/oauth-authorization-server`

**Cursor**: This project includes `.cursor/mcp.json` with the `family-recipes` server pointing to `http://localhost:3000/mcp`. To test:

1. Start the dev server: `npm run dev`
2. Register an OAuth client (one-time): `curl -X POST http://localhost:3000/api/mcp/oauth/register -H "Content-Type: application/json" -d '{"client_name": "Cursor", "redirect_uris": ["http://localhost:8080/callback"]}'`
3. Restart Cursor (or reload the window) so it picks up the MCP config
4. In Cursor: Settings → Tools & MCP → the `family-recipes` server should appear. Click "Connect" (or equivalent); a browser opens for login and consent.

**Claude Code**: See [Usage with Claude Code](#usage-with-claude-code) below. Run `claude mcp add --transport http family-recipes <APP_URL>/mcp`; the first use triggers browser login.

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

### Weekly Menus

Weekly menus schedule recipes onto days of the week and finalize into a shopping
list. Weeks use ISO labels (`2026-W35`); omit the label for the current week. A
menu moves through `building` → `survey-sent` → `locked-in`. The acting owner
defaults to `OWNER_EMAIL`.

| Tool | Scope | Description | Inputs |
|------|-------|-------------|--------|
| `menu_get_week` | `menu:read` | Get or create a week's menu | `weekLabel?`, `userEmail?` |
| `menu_add_dinner` | `menu:write` | Add a cookbook recipe to a day | `recipeSlug`, `day`, `mealSlot?`, `weekLabel?`, `userEmail?` |
| `menu_remove_assignment` | `menu:write` | Remove an assignment | `menuId`, `assignmentId` |
| `menu_send_survey` | `menu:write` | Open family voting (before finalizing) | `menuId` |
| `menu_finalize` | `menu:write` | Lock in the menu and build its shopping list | `menuId`, `userEmail?` |

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
