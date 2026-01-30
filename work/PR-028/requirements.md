# PR-028: Add `recipes:write` OAuth Scope - Requirements

> **Status**: Approved
> **PR Branch**: `feat/028-recipes-write-scope`
> **Dependencies**: None

---

## Problem Statement

The MCP server currently has no write capabilities for recipes. Users cannot create or update recipes via MCP tools because there is no `recipes:write` OAuth scope to authorize these operations.

---

## User Stories

### Story 1: AI Client Requests Recipe Write Permission

**As an** AI client (e.g., Claude Code)
**I want** to request the `recipes:write` OAuth scope
**So that** I can be authorized to create and update recipes on behalf of the user

#### Acceptance Criteria

```gherkin
Feature: recipes:write OAuth scope

  Scenario: Scope is available for OAuth authorization
    Given an OAuth client requests authorization
    When the client includes "recipes:write" in the scope parameter
    Then the scope is recognized as valid
    And the user can consent to granting this scope

  Scenario: Scope description is shown during consent
    Given a user is on the OAuth consent screen
    When they see the requested scopes
    Then "recipes:write" shows a clear description of what it allows
```

---

## Out of Scope

- Implementing MCP tools (PR-029, PR-030, PR-031)
- UI changes to consent screen
- Scope revocation UI

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Scope validity | `recipes:write` passes `parseScopes()` | Unit test or manual verification |
| TypeScript types | `OAuthScope` includes `recipes:write` | Typecheck passes |

---

## Open Questions

- [x] Should we use `recipes:write` or separate `recipes:create` and `recipes:update`? → Single `recipes:write` (matches `shopping:write` pattern)

---

## References

- `src/lib/oauth/types.ts` - Existing scope definitions
- PR-015 - Original MCP implementation
