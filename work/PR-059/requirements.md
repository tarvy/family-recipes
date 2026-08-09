# PR-059: Mail OAuth Scope Delegation - Requirements

> **Status**: Approved (operator-authorized Newt integration)
> **PR Branch**: `cursor/oauth-mail-scopes`
> **Dependencies**: PR-007, PR-008, PR-015

## Problem Statement

Newt will use Family Recipes as the operator-owned OAuth authorization server
for Claude and other remote MCP clients. The existing OAuth server validates
requested scopes against a closed allowlist, so it currently drops Newt's
`mail:read` and `mail:write` scopes. The provider must recognize and preserve
those delegated scopes without exposing any Family Recipes tools to the mail
server.

## User Stories

### Story 1: Delegate Newt mail access

**As the** owner of both applications
**I want** Family Recipes to issue OAuth tokens containing Newt mail scopes
**So that** Newt can validate the token and Claude can connect through OAuth.

#### Acceptance Criteria

```gherkin
Feature: Mail OAuth scope delegation

  Scenario: Read scope is preserved
    Given a client requests the mail:read scope
    When the authorization flow completes
    Then the issued access token contains mail:read
    And the token response reports mail:read

  Scenario: Write scope is preserved
    Given a client requests mail:read and mail:write
    When the authorization flow completes
    Then the issued access token contains both requested mail scopes

  Scenario: Existing scopes remain compatible
    Given a client requests recipes:read
    When the authorization flow completes
    Then recipes:read behaves exactly as before
    And mail scopes are not granted implicitly

  Scenario: Invalid scopes are rejected or filtered
    Given a client requests an unknown scope
    When the authorization request is processed
    Then the unknown scope is not granted
    And no unrelated tool scope is added
```

## Out of Scope

- Newt implementation or Fly deployment changes.
- A second identity system.
- Changes to Family Recipes tool authorization.
- Adding mail tools to Family Recipes.
- Sharing raw credentials or JWT secrets in source control.

## Success Metrics

| Metric | Target | How to Measure |
|---|---:|---|
| Mail scopes in discovery metadata | 2 | Inspect OAuth metadata |
| Mail scopes preserved in requested token flow | 100% | Typecheck plus route review |
| Existing recipe scopes regressed | 0 | Existing checks and manual metadata review |

## References

- `docs/MCP.md`
- `docs/AUTH.md`
- `src/lib/oauth/types.ts`
- Newt `.ai/specs/v1-blockers-execution.md`
