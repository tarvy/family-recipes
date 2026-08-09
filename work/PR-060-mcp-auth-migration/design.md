# PR-060: MCP Auth Plane Migration - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-08-08
> **Author**: Cursor Agent

---

## Overview

Add a second, RS256/JWKS-based token verification path to Family Recipes'
MCP resource-server code, selected by a new `MCP_AUTH_MODE` setting that
defaults to `mcp-auth` whenever `MCP_RESOURCE_URL` is configured, and falls
back to the existing HS256 `legacy` path (today's behavior, zero config
change) otherwise. Advertise RFC 9728 protected-resource metadata pointing
at mcp-auth. Remove the `mail:read`/`mail:write` scopes added by PR-059. The
local OAuth AS route handlers are untouched code-wise and remain available
as the `legacy` mode's token issuer / rollback path; they are not deleted.

---

## Architecture

### System Context

```
                      mcp-auth (https://auth.tarvy.dev)
                      issues RS256 tokens, aud=resource-specific
                             │
              ┌──────────────┼──────────────────┐
              ▼                                  ▼
   Family Recipes /mcp                    Newt mail MCP (already migrated)
   resource = MCP_RESOURCE_URL             resource = mail.tarvy.dev/mcp
   (target: recipes.tarvy.dev/mcp)
              │
              │ legacy rollback path (MCP_AUTH_MODE=legacy)
              ▼
   Family Recipes' own OAuth AS (/api/oauth/*, HS256, JWT_SECRET)
   - unchanged code, no longer the default
   - web login (magic links/passkeys/sessions) is a fully separate
     subsystem and is NOT part of this AS; untouched by this PR either way
```

### Component Design

```
src/lib/oauth/
├── types.ts            (MODIFIED: remove mail:* from OAUTH_SCOPES)
├── tokens.ts            (unchanged: legacy HS256 sign/verify + AS issuer)
├── pkce.ts              (unchanged)
├── crypto.ts            (unchanged)
├── resource-server.ts   (NEW: MCP_AUTH_MODE resolution, RS256/JWKS
│                          verification, protected-resource metadata builder)
├── mcp-auth.ts          (MODIFIED: verifyMcpAuth becomes async, dispatches
│                          to legacy or mcp-auth verification by mode)
└── index.ts             (MODIFIED: export new resource-server pieces)

src/app/
├── mcp/route.ts                                  (MODIFIED: await verifyMcpAuth,
│                                                    WWW-Authenticate on 401)
├── .well-known/oauth-protected-resource/
│   ├── mcp/route.ts                              (NEW: canonical RFC 9728 path)
│   └── route.ts                                  (NEW: root fallback)
├── api/mcp/.well-known/oauth-protected-resource/route.ts (NEW: MCP-relative
│                                                    re-export, matches the
│                                                    existing AS-metadata
│                                                    dual-route pattern)
└── authorize/page.tsx                            (MODIFIED: remove mail:*
                                                     from SCOPE_ICONS)

examples/
└── seed-recipes-resource.json  (NEW: payload for `mcp-auth-resources add`)
```

### Data Flow (mcp-auth mode)

```
MCP client                 auth.tarvy.dev                Family Recipes /mcp
    | GET /authorize?resource=https://recipes.tarvy.dev/mcp             |
    |------------------------------->|                                  |
    | ... mcp-auth login/consent hop (Cloudflare Access) ...            |
    | access_token (RS256, aud=recipes resource)                        |
    |<-------------------------------|                                  |
    | POST /mcp  Authorization: Bearer <token>                          |
    |------------------------------------------------------------------>|
    |                     verifyMcpAuth(): mode=mcp-auth                |
    |                       -> jwtVerify(token, remoteJWKS(issuer), {   |
    |                            issuer, audience: resource })          |
    |                       -> check claims.resource === resource       |
    |                       -> map claims.scope -> McpAuthContext       |
    |<-- tool result (if scopes satisfy TOOL_SCOPES) ------------------|
```

### Data Flow (legacy mode - rollback)

Unchanged from today: Family Recipes' own `/api/oauth/{authorize,token,register}`
issue HS256 tokens signed with `JWT_SECRET`; `verifyMcpAuth` calls the
existing `verifyAccessToken` (HS256, HMAC, `iss` check against
`getOAuthIssuer()`).

---

## Mode Resolution

```ts
function resolveMcpAuthMode(): 'mcp-auth' | 'legacy' {
  const explicit = process.env.MCP_AUTH_MODE;
  if (explicit === 'mcp-auth' || explicit === 'legacy') return explicit;
  // MCP_AUTH_ISSUER_URL always has a default (auth.tarvy.dev); the
  // presence of an explicit MCP_RESOURCE_URL is what opts a deployment
  // into mcp-auth mode, since a resource URL must be deliberately chosen
  // per-deployment (Vercel URL during transition, recipes.tarvy.dev at
  // cutover). No resource URL configured => stay on the legacy path with
  // zero behavior change for existing deployments.
  return process.env.MCP_RESOURCE_URL ? 'mcp-auth' : 'legacy';
}
```

This mirrors Newt's `build_http_server()` gating (`tarvy/newt`
`src/newt/mcp/server.py`): mcp-auth mode requires both an issuer (defaulted)
and an explicit resource URL; legacy mode requires nothing new so existing
Vercel deployments are unaffected until an operator opts in.

## Token Verification (mcp-auth mode)

- Library: `jose` (`createRemoteJWKSet` + `jwtVerify`), matching the RS256
  JWKS approach mcp-auth issues tokens with (`joserfc`/RS256 on the server
  side, standard JWKS on the wire).
- `jwtVerify(token, keySet, { issuer, audience: resource })` enforces both
  issuer and audience/resource binding in one call - a token minted for
  `https://mail.tarvy.dev/mcp` fails the `audience` check against Family
  Recipes' resource and is rejected. This is the audience-isolation
  guarantee requested in the requirements.
- Defense in depth: also explicitly compares the `resource` claim (mcp-auth
  always sets `resource === aud`) in case a future token shape omits `aud`
  fidelity.
- `keySet` resolution is injectable (`JWTVerifyGetKey`) so unit tests can
  pass a `createLocalJWKSet` built from a test keypair instead of hitting
  the network - the same `jwtVerify` code path runs in tests and
  production, only the key source differs.
- Scopes: `claims.scope` (space-delimited) maps to `McpAuthContext.scopes`,
  reusing the existing `hasRequiredScopes`/`getToolScopes`/`TOOL_SCOPES`
  logic unchanged - `recipes:read`, `recipes:write`, `shopping:read`,
  `shopping:write` behave identically regardless of which mode issued the
  token.
- Identity: `claims.sub` (mcp-auth's authenticated identity, e.g. Cloudflare
  Access email) becomes `McpAuthContext.userId`; `claims.client_id` (falling
  back to `claims.sub`) becomes `clientId`. Neither is written back into
  MongoDB - `McpAuthContext.userId` is only used for observability
  (`span.setAttribute`) today, so no user-record linkage is required.

## Protected Resource Metadata (RFC 9728)

Route: `/.well-known/oauth-protected-resource/mcp` (canonical, matches
`build_resource_metadata_url` semantics: well-known prefix inserted before
the resource's own path). Root fallback at
`/.well-known/oauth-protected-resource` for older clients per the MCP SDK's
fallback order. Both share one builder function to avoid duplicating the
JSON shape (thai-lint DRY).

```json
{
  "resource": "<MCP_RESOURCE_URL or self>",
  "authorization_servers": ["<MCP_AUTH_ISSUER_URL or self AS issuer>"],
  "scopes_supported": ["recipes:read", "recipes:write", "shopping:read", "shopping:write"],
  "bearer_methods_supported": ["header"],
  "resource_name": "Family Recipes MCP"
}
```

In `legacy` mode this still resolves and self-describes (resource = current
app URL + `/mcp`, authorization_servers = Family Recipes' own AS issuer) so
discovery keeps working during the transition window either way.

`/mcp`'s 401 responses gain a `WWW-Authenticate` header:

```
WWW-Authenticate: Bearer error="invalid_token", error_description="...", resource_metadata="https://.../.well-known/oauth-protected-resource/mcp"
```

matching the format the MCP Python SDK's `BearerAuthBackend` already uses
(`mcp.server.auth.middleware.bearer_auth`), so client libraries that know
this convention (used by Newt's own resource server) work unmodified.

---

## File Structure

```
src/
├── app/
│   ├── mcp/route.ts                                     (modified)
│   ├── authorize/page.tsx                               (modified)
│   ├── .well-known/oauth-protected-resource/mcp/route.ts (new)
│   ├── .well-known/oauth-protected-resource/route.ts     (new)
│   └── api/mcp/.well-known/oauth-protected-resource/route.ts (new)
├── lib/
│   └── oauth/
│       ├── resource-server.ts   (new)
│       ├── mcp-auth.ts          (modified)
│       ├── types.ts             (modified: drop mail:* scopes)
│       └── index.ts             (modified: new exports)
examples/
└── seed-recipes-resource.json   (new)
docs/
├── MCP.md          (modified)
├── ENVIRONMENT.md  (modified)
└── AUTH.md         (modified: mcp-auth boundary note)
.env.example        (modified)
```

---

## Dependencies

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `jose` | ^6 | RS256 JWT verification against a remote/local JWKS |
| `vitest` (dev) | ^3 | Unit test runner (none existed in this repo before) |

### Internal Dependencies

- Depends on: `src/lib/oauth/{types,tokens,pkce,crypto}.ts` (unchanged
  contracts)
- Used by: `src/app/mcp/route.ts`, new protected-resource metadata routes

---

## Security Considerations

- [x] Audience/resource binding enforced via `jose`'s `audience` option -
  a token minted for a different mcp-auth resource is rejected.
- [x] Issuer pinned (`MCP_AUTH_ISSUER_URL`, default `https://auth.tarvy.dev`);
  a token from an unrelated issuer is rejected regardless of signature
  validity.
- [x] JWKS fetched over HTTPS only (`createRemoteJWKSet` requires an
  `https:`/`http:` URL; production config always uses `https:`).
- [x] Legacy HS256 path unchanged - no new attack surface introduced there,
  and it now requires an explicit opt-in (`MCP_AUTH_MODE=legacy`) once an
  operator has configured `MCP_RESOURCE_URL` for a deployment (before that,
  it remains the implicit default, matching today's behavior exactly).
- [x] No sensitive data (tokens, secrets) logged - `logger.mcp.warn` calls
  only log the error string/client id, unchanged from before.
- [x] Web session cookies, magic links, and passkeys are untouched: they
  live in an entirely separate module (`src/lib/auth/*`) with no shared code
  path with `src/lib/oauth/*`.

---

## Testing Strategy

### Unit Tests (`vitest`, new to this repo)

| Module | Test Focus |
|--------|------------|
| `resource-server.ts` | Mode resolution (explicit override, default inference from `MCP_RESOURCE_URL`, invalid value handling) |
| `resource-server.ts` | RS256 JWKS verification happy path (local JWKS, correct issuer/audience/scope) |
| `resource-server.ts` | Audience isolation: token minted for a different resource (e.g. Newt's mail resource) is rejected |
| `resource-server.ts` | Expired token rejected; wrong issuer rejected; malformed token rejected |
| `resource-server.ts` | Protected-resource metadata builder output shape (mcp-auth mode and legacy mode) |
| `types.ts` | Regression guard: `mail:read`/`mail:write` are not present in `OAUTH_SCOPES`/`VALID_SCOPES` |
| `mcp-auth.ts` | `isAuthorizedForTool` still gates on `TOOL_SCOPES` regardless of which mode issued the token |

No integration/E2E test harness exists in this repo; manual verification
steps are documented in `progress.md` and `docs/MCP.md` instead.

---

## Rollout Plan

1. Ship this PR with `MCP_AUTH_MODE` unset in production - `MCP_RESOURCE_URL`
   also unset, so behavior is byte-for-byte identical to today (`legacy`
   mode, HS256, Family Recipes' own AS). No user-visible change at deploy
   time.
2. Operator registers the Family Recipes resource with mcp-auth
   (`examples/seed-recipes-resource.json`, resource URL =
   `${NEXT_PUBLIC_APP_URL}/mcp` during the Vercel-hosted transition period).
3. Operator sets `MCP_RESOURCE_URL` (and optionally `MCP_AUTH_ISSUER_URL` if
   overriding the `https://auth.tarvy.dev` default) in Vercel - this flips
   the default mode to `mcp-auth` on next deploy.
4. Re-register MCP clients (Claude Code/Cursor/etc.) against mcp-auth's
   `/authorize` flow for the Family Recipes resource.
5. Once `recipes.tarvy.dev` DNS/hosting is ready, update `MCP_RESOURCE_URL`
   to `https://recipes.tarvy.dev/mcp` and re-register the resource under
   the new URL (or update the existing resource record's URL if mcp-auth
   supports in-place rename; otherwise add-then-remove).
6. Monitor `logger.mcp.warn`/`error` output for unexpected auth failures.
7. Rollback: set `MCP_AUTH_MODE=legacy` (or unset `MCP_RESOURCE_URL`) to
   immediately return to Family Recipes' own AS with zero code changes.

---

## Alternatives Considered

### Option A: Remove the local OAuth AS endpoints entirely in this PR
- **Pros**: Cleaner end state, less code to maintain.
- **Cons**: No rollback path if mcp-auth registration/DNS isn't ready in
  production at deploy time; higher risk given this app's OAuth AS is a
  single Vercel deployment with no staging environment.
- **Why rejected**: The task's own guidance prefers a feature-flagged
  rollback; risk/benefit favors keeping the endpoints and documenting them
  as rollback-only.

### Option B: Feature-flagged dual mode with legacy default until manually promoted (Selected)
- **Pros**: Zero-risk deploy (no behavior change until `MCP_RESOURCE_URL`
  is set); explicit, auditable cutover step; trivial rollback.
- **Cons**: Slightly more code (two verification paths) to maintain during
  the transition window.
- **Why selected**: Matches the sibling Newt migration's proven pattern and
  the task's explicit preference.

---

## Open Design Questions

- [ ] Whether to eventually delete `/api/oauth/*` and `src/lib/oauth/tokens.ts`'s
  HS256 signing path once `recipes.tarvy.dev` is live and stable - deferred
  to a follow-up PR once the transition window closes.
