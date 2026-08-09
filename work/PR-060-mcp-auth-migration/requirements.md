# PR-060: MCP Auth Plane Migration - Requirements

> **Status**: Approved (operator-directed migration)
> **PR Branch**: `cursor/mcp-auth-resource-migration`
> **Dependencies**: PR-015 (MCP Server), PR-059 (Mail OAuth Scope Delegation - superseded by this PR)

---

## Problem Statement

Family Recipes currently acts as its own OAuth 2.1 authorization server (AS)
for its MCP resource server (`/mcp`), signing HS256 access tokens with the
shared `JWT_SECRET`. PR-059 additionally taught this AS to recognize and
delegate `mail:read`/`mail:write` scopes so Newt's remote mail MCP could use
Family Recipes as a stand-in authorization server during Newt's own
migration.

Newt has now completed its migration to `mcp-auth` (`https://auth.tarvy.dev`),
a standalone, resource-scoped OAuth 2.1 authorization server built for this
purpose (see `tarvy/mcp-auth`, PR-001). Family Recipes should follow the same
pattern: become an independent protected resource registered with
`mcp-auth`, validate RS256 access tokens against `mcp-auth`'s JWKS with
audience binding to its own resource URL, and drop the temporary
`mail:read`/`mail:write` delegation entirely now that Newt no longer depends
on it.

Web login (magic links, passkeys, session cookies) is a completely separate
subsystem (opaque session tokens stored in MongoDB, validated via
`getSessionFromCookies`) and must be unaffected by this migration.

---

## User Stories

### Story 1: MCP clients authenticate against mcp-auth

**As an** MCP client (Claude Code, Cursor, etc.)
**I want** to obtain a Family Recipes access token from `https://auth.tarvy.dev`
**So that** I can call Family Recipes MCP tools without Family Recipes acting
as its own authorization server.

#### Acceptance Criteria

```gherkin
Feature: mcp-auth resource-server verification

  Scenario: Valid mcp-auth token is accepted
    Given mcp-auth has issued an RS256 access token
    And the token's audience/resource matches Family Recipes' registered
      resource URL
    And the token carries a recipes/shopping scope
    When the token is presented as a Bearer token to /mcp
    Then the request is authenticated
    And the granted scopes are honored by tool authorization

  Scenario: Token minted for a different resource is rejected (audience isolation)
    Given mcp-auth has issued an RS256 access token for Newt's mail resource
      (https://mail.tarvy.dev/mcp)
    When that token is presented as a Bearer token to Family Recipes' /mcp
    Then the request is rejected as unauthenticated

  Scenario: Legacy HS256 tokens still work when explicitly enabled for rollback
    Given MCP_AUTH_MODE is set to "legacy"
    And a client holds a Family Recipes-issued HS256 access token
    When the token is presented as a Bearer token to /mcp
    Then the request is authenticated exactly as before this migration
```

### Story 2: Family Recipes advertises mcp-auth as its authorization server

**As an** MCP client performing OAuth discovery
**I want** Family Recipes' protected-resource metadata to point at mcp-auth
**So that** my OAuth client library can complete the authorization flow
against the correct issuer.

#### Acceptance Criteria

```gherkin
Feature: RFC 9728 protected resource metadata

  Scenario: Metadata is served at the RFC 9728 path
    Given MCP_AUTH_MODE resolves to "mcp-auth"
    When a client requests /.well-known/oauth-protected-resource/mcp
    Then the response lists https://auth.tarvy.dev (or configured issuer) as
      an authorization server
    And lists the recipes/shopping scopes as supported

  Scenario: 401 responses advertise the metadata URL
    Given a request to /mcp is missing or has an invalid Bearer token
    When Family Recipes returns 401
    Then the WWW-Authenticate header includes resource_metadata pointing at
      the protected-resource metadata URL
```

### Story 3: Newt mail scopes are removed from Family Recipes

**As the** operator of both applications
**I want** Family Recipes to stop recognizing `mail:read`/`mail:write`
**So that** Family Recipes is no longer responsible for Newt's mail
authorization, and the two applications' grants are independently
revocable.

#### Acceptance Criteria

```gherkin
Feature: Mail scope removal

  Scenario: Mail scopes are no longer valid
    Given a client requests the mail:read scope from Family Recipes' own
      /api/oauth/authorize
    When the authorization request is processed
    Then mail:read is filtered out (not a recognized scope)

  Scenario: Consent UI no longer displays mail scopes
    Given a user reaches the consent screen
    Then no mail:read or mail:write entries are rendered

  Scenario: Recipes/shopping scopes are unaffected
    Given a client requests recipes:read
    When the authorization flow completes
    Then recipes:read behaves exactly as before
```

### Story 4: Family Recipes and Newt grants are independent

**As the** operator
**I want** revoking one application's mcp-auth grant to have no effect on
the other
**So that** I can rotate/revoke access per-application.

#### Acceptance Criteria

```gherkin
Feature: Independent revocation

  Scenario: Revoking Family Recipes does not affect Newt
    Given mcp-auth has independent resource records for
      https://recipes.tarvy.dev/mcp and https://mail.tarvy.dev/mcp
    When the operator revokes all grants for the Family Recipes resource
    Then Newt's mail resource grants are untouched (mcp-auth-level guarantee;
      verified by resource-scoped revocation in the mcp-auth registry)
```

---

## Out of Scope

- Changes to the mcp-auth repository itself (resource registration is an
  operator step, documented here, executed against the deployed mcp-auth
  instance).
- Cloudflare DNS cutover for `recipes.tarvy.dev` (operator step).
- Changing web login (magic links, passkeys, sessions) - explicitly out of
  scope and must not regress.
- Removing the local OAuth AS route handlers (`/api/oauth/*`) in this PR -
  kept as a documented, feature-flagged rollback path (`MCP_AUTH_MODE=legacy`).
- Newt-side code changes (already completed in `tarvy/newt`).

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| `mail:read`/`mail:write` present in `OAUTH_SCOPES` | 0 | Inspect `src/lib/oauth/types.ts` |
| RS256 JWKS verification unit tests passing | 100% | `npm run test` |
| Audience isolation test (mail-resource token rejected) | Passing | `npm run test` |
| Existing recipes/shopping scope behavior regressed | 0 | Unit tests + manual smoke test |
| Lint/typecheck clean | 0 errors | `npm run lint`, `npm run typecheck` |
| RFC 9728 metadata endpoint reachable | 200 JSON | Manual curl once deployed |

---

## Open Questions

- [x] Should local AS endpoints be removed entirely in this PR? No - kept
  behind `MCP_AUTH_MODE=legacy` for rollback, per operator guidance.
- [ ] Final production resource URL: `https://recipes.tarvy.dev/mcp` requires
  Cloudflare DNS + hosting decision (Vercel custom domain vs. proxy). Until
  then, operators should set `MCP_RESOURCE_URL` to the current
  `${NEXT_PUBLIC_APP_URL}/mcp` value.

---

## References

- `docs/MCP.md`, `docs/AUTH.md`, `docs/ENVIRONMENT.md`
- `work/PR-059/requirements.md` (the delegation this PR supersedes)
- `tarvy/mcp-auth` `.ai/ai-context.md`, `.ai/how_tos/how-to-deploy-mcp-auth.md`
- `tarvy/newt` `src/newt/mcp/auth.py`, `src/newt/mcp/server.py`,
  `.ai/how_tos/how-to-register-newt-with-mcp-auth.md` (sibling migration,
  already merged)
