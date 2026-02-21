# PR-038: MCP Operability Documentation - Requirements

> **Status**: Draft
> **PR Branch**: `feat/038-mcp-operability-docs`
> **Dependencies**: None

---

## Problem Statement

The MCP server is implemented with OAuth 2.1 Bearer-only authentication, but documentation is inconsistent: ENVIRONMENT.md describes an `MCP_API_KEY` and `x-api-key` header that are not implemented, and ARCHITECTURE.md refers to "public MCP with API key." There is no single, actionable checklist for making the MCP operable (env, client registration, client configuration). This PR aligns documentation with the implementation and adds a clear operability guide.

---

## User Stories

### Story 1: Operator configuring MCP for the first time

**As a** developer or operator deploying or using the Family Recipes MCP
**I want** accurate environment docs and a step-by-step "making MCP operable" guide
**So that** I can get the MCP working with Cursor or Claude Code without guessing.

#### Acceptance Criteria

```gherkin
Feature: MCP operability documentation

  Scenario: Environment variables are accurate for MCP
    Given I am setting up the app for MCP use
    When I read docs/ENVIRONMENT.md
    Then MCP-related variables match the implementation (OAuth only; no API key unless implemented)
    And JWT_SECRET, NEXT_PUBLIC_APP_URL, and optional MCP vars are clearly described

  Scenario: Operability checklist exists
    Given I want to make the MCP usable from Cursor or Claude Code
    When I follow docs/MCP.md (or a linked section)
    Then I find a clear sequence: required env → OAuth client registration → client config
    And I am not directed to use x-api-key or MCP_API_KEY for auth

  Scenario: Architecture reflects actual auth
    Given I read docs/ARCHITECTURE.md security section
    When I look at MCP/auth wording
    Then It states that MCP is secured with OAuth 2.1 Bearer tokens
    And It does not claim "public MCP with API key" unless API key auth is implemented
```

### Story 2: Reader verifying MCP auth behavior

**As a** maintainer or integrator
**I want** docs to match the code (src/lib/oauth/mcp-auth.ts, src/app/mcp/route.ts)
**So that** I can trust the docs when debugging or extending MCP auth.

#### Acceptance Criteria

```gherkin
Feature: Documentation consistency for MCP auth

  Scenario: No API key documented without implementation
    Given the code only verifies OAuth Bearer tokens for MCP
    When I read ENVIRONMENT.md and ARCHITECTURE.md
    Then MCP_API_KEY and x-api-key are not documented as supported
    Or they are explicitly marked as "planned" / "future" with a reference to this PR or a follow-up
```

---

## Out of Scope

- Implementing API key authentication for MCP (can be a future PR).
- Changes to MCP route or OAuth code (this PR is documentation only).
- Cursor/Claude-specific config file examples (only document the flow and where to configure).

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| MCP env section accuracy | 100% match to code | Manual review of ENVIRONMENT.md vs mcp-auth.ts and route |
| Operability path | Single coherent path | Reader can follow MCP.md (or linked section) end-to-end |
| No misleading auth claims | Zero | ARCHITECTURE and ENVIRONMENT do not state API key is supported |

---

## Open Questions

- [ ] None; scope is doc-only and aligned with existing implementation.

---

## References

- docs/MCP.md
- docs/ENVIRONMENT.md
- docs/ARCHITECTURE.md
- src/lib/oauth/mcp-auth.ts
- src/app/mcp/route.ts
