# PR-065: MCP OAuth Sign-in Loop - Requirements

> **Status**: Approved (requested directly by the owner, Travis)
> **PR Branch**: `fix/mcp-oauth-loop`
> **Dependencies**: PR-060 (legacy-mode OAuth AS + RFC 9728 metadata)

## Problem Statement

Cursor's remote MCP connector signs in to `/mcp`, the browser login completes,
and then the connector goes back to needing auth ("resolves, then starts
over"). Earlier it sat at `needsAuth` with 0 tools while believing it was
authenticated.

## Acceptance Criteria

```gherkin
Feature: MCP OAuth sign-in completes

  Scenario: Every MCP request requires a valid token
    Given no token, a bogus token, or an expired token
    When an MCP client POSTs initialize (or any method) to /mcp
    Then the response is 401
    And WWW-Authenticate carries resource_metadata=".../.well-known/oauth-protected-resource/mcp"

  Scenario: Public client registration
    Given a DCR request with token_endpoint_auth_method "none"
    When it is registered
    Then no client_secret is issued
    And the token endpoint accepts authorization_code (with PKCE) and refresh_token without a secret
    And confidential clients still must present their secret

  Scenario: Login started from the consent page returns to it
    Given a signed-out user on /authorize?...
    When they sign in by magic link or passkey
    Then they land back on /authorize?... (same-origin relative return_to only)
    And a stale session cookie does not cause a /login <-> /authorize bounce
```

## Out of Scope

- Data-model / schema / migration changes
- Refresh-token reuse grace window (follow-up)
