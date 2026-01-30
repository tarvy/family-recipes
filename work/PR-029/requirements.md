# PR-029: Add `recipe_create` MCP Tool - Requirements

> **Status**: Approved
> **PR Branch**: `feat/029-recipe-create-tool`
> **Dependencies**: PR-028 (recipes:write scope)

---

## Problem Statement

Users want to add new recipes via MCP from AI clients (e.g., Claude Code on mobile). Currently, there's no MCP tool to create recipes - all tools are read-only.

---

## User Stories

### Story 1: Create Recipe via MCP

**As an** AI assistant user
**I want** to create a new recipe by providing Cooklang content
**So that** I can add recipes from my phone without accessing the filesystem directly

#### Acceptance Criteria

```gherkin
Feature: recipe_create MCP tool

  Scenario: Successfully create a new recipe
    Given I have an OAuth token with recipes:write scope
    And I provide valid Cooklang content with a title
    And I specify a valid category like "entrees"
    When I call the recipe_create tool
    Then the recipe file is written to recipes/{category}/{slug}.cook
    And the response includes success: true and the slug

  Scenario: Category validation
    Given I provide an invalid category "invalid-category"
    When I call the recipe_create tool
    Then the request fails with "Invalid category" error
    And no file is written

  Scenario: Missing recipes:write scope
    Given I have an OAuth token without recipes:write scope
    When I call the recipe_create tool
    Then the request fails with authorization error
```

---

## Out of Scope

- MongoDB sync (handled by existing sync mechanism)
- Updating existing recipes (PR-030)
- Creating new categories (manual `mkdir` for now)
- Image upload

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Recipe creation works | File written to correct location | Manual test |
| Category validation | Invalid categories rejected | Manual test |
| Scope enforcement | Unauthorized requests rejected | Manual test |

---

## Open Questions

- [x] Input format: Raw Cooklang vs structured JSON? → Raw Cooklang (preserves formatting, matches API)
- [x] Slug derivation: From title metadata or filename? → Derived from `>> title:` in Cooklang content

---

## References

- `src/lib/recipes/writer.ts` - `writeRawCooklangContent()` function
- `src/mcp/tools/shopping.ts` - Reference pattern for write tools
- `src/lib/oauth/types.ts` - TOOL_SCOPES mapping
