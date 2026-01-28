# PR-015: MCP Server - Requirements

> **Status**: Draft
> **PR Branch**: `feat/mcp-server`
> **Dependencies**: PR-009, PR-014

---

## Problem Statement

Family Recipes needs a secure MCP server so AI agents (Claude Code, Cursor, etc.) can interact with recipes and shopping lists through a standard protocol. The server must be observable, authenticated via API key, and expose stable tools for listing/searching recipes and generating shopping lists.

---

## User Stories

### Story 1: AI agent accesses recipe data

**As an** AI agent
**I want** to list, search, and fetch recipes through MCP tools
**So that** I can answer questions and draft meal plans from the recipe library

#### Acceptance Criteria

```gherkin
Feature: MCP recipe tools

  Scenario: List recipes
    Given the MCP API key is valid
    When the agent calls tool "recipe_list"
    Then the response includes recipe previews
    And the response is JSON-RPC compliant

  Scenario: Search recipes
    Given the MCP API key is valid
    When the agent calls tool "recipe_search" with a query
    Then the response includes matching recipes
    And search respects optional filters

  Scenario: Get recipe details
    Given the MCP API key is valid
    When the agent calls tool "recipe_get" with a slug
    Then the response includes full recipe detail
```

### Story 2: AI agent creates shopping lists

**As an** AI agent
**I want** to create and fetch shopping lists via MCP
**So that** I can provide grocery lists based on selected recipes

#### Acceptance Criteria

```gherkin
Feature: MCP shopping list tools

  Scenario: Create shopping list
    Given the MCP API key is valid
    When the agent calls tool "shopping_list_create" with recipe slugs
    Then a shopping list is created
    And the response includes aggregated items

  Scenario: Get shopping list
    Given the MCP API key is valid
    When the agent calls tool "shopping_list_get" with a list id
    Then the response includes the shopping list
```

---

## Out of Scope

- UI changes for MCP
- User-facing auth flows beyond MCP API key
- Advanced meal plan suggestion logic

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| MCP tool success rate | 99% | MCP request logs and traces |
| Median MCP response time | < 500ms | Trace spans in Grafana |
| MCP auth failures | 0 unintended | Log review for invalid API key usage |

---

## Open Questions

- [ ] Should MCP calls be scoped to a specific user (owner) by default?
- [ ] Do we want session-based MCP transport or stateless JSON-only responses?

---

## References

- docs/ARCHITECTURE.md
- docs/ENVIRONMENT.md
- Model Context Protocol TypeScript SDK docs
