# PR-059: Mail OAuth Scope Delegation - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-08-08
> **Author**: Cursor

## Overview

Extend the existing Family Recipes OAuth scope registry with `mail:read` and
`mail:write`. The existing authorization-code, PKCE, consent, JWT, and refresh
token code already preserves arbitrary valid scopes; adding the two scopes to
the canonical registry makes them discoverable and grantable without changing
Family Recipes tool authorization.

## Architecture

```text
Claude / Cursor
      │ OAuth authorization-code + PKCE
      ▼
Family Recipes OAuth server
      │ access token: user_id + issuer + mail scopes
      ▼
Newt MCP resource server on Fly
      │ IMAP service account credentials stay in Fly
      ▼
Gmail / Proton Bridge
```

Newt validates the Family Recipes issuer, token signature, expiry, user
identity, and mail scopes. Family Recipes remains the authorization server and
consent UI; it does not receive Newt mail credentials.

## Code Changes

Modify `src/lib/oauth/types.ts`:

- Add `mail:read` with the Newt read-tool description.
- Add `mail:write` with the Newt explicitly-confirmed mutation description.
- Do not add either scope to `TOOL_SCOPES`, because Family Recipes exposes no
  mail tools.

Update `docs/MCP.md` to document that the two scopes are delegated to the
Newt MCP resource server and are not Family Recipes capabilities.

## Security Considerations

- Existing PKCE S256 validation remains mandatory.
- Existing exact redirect URI validation remains unchanged.
- Mail scopes are never granted implicitly.
- The Newt deployment must validate issuer and scope before exposing tools.
- The shared JWT verification secret is an operator deployment secret and must
  be injected through provider secret stores, never committed.

## Testing Strategy

- Run `npm run lint`.
- Run `npm run typecheck`.
- Inspect OAuth discovery metadata for both mail scopes.
- Complete one authorization-code flow requesting `mail:read`.
- Complete one flow requesting `mail:read mail:write`.
- Confirm a recipe-only token does not contain mail scopes.

## Rollout Plan

1. Merge this scope-only PR.
2. Deploy Family Recipes with the existing OAuth environment.
3. Configure Newt with the Family Recipes issuer and verification secret.
4. Test read-only Newt access from Claude web/Desktop.
5. Test Claude mobile custom connector setup.
6. Enable `mail:write` only after Newt mutation gates are complete.

## Alternatives Considered

### Add a separate identity provider to Newt

- Pros: Independent service ownership.
- Cons: Duplicates login, consent, client registration, refresh, and revoke
  behavior already operating for the owner.
- Rejected for this personal deployment.

### Reuse recipe scopes for mail

- Pros: No provider change.
- Cons: Misrepresents permissions and makes least-privilege enforcement
  impossible.
- Rejected.

### Selected: Add explicit delegated mail scopes

- Pros: Reuses the proven OAuth provider while preserving resource-server
  scope separation.
- Cons: Requires a shared operator deployment contract and issuer validation in
  Newt.
