# PR-031: Add `recipe_categories` MCP Tool - Requirements

> **Status**: Approved
> **PR Branch**: `feat/031-recipe-categories-tool`
> **Dependencies**: None (can parallel with PR-029/030)

---

## Problem Statement

AI clients creating or updating recipes need to know which categories are valid. Currently, they must guess or hardcode category names, leading to potential errors.

---

## User Stories

### Story 1: Discover Valid Categories

**As an** AI assistant
**I want** to query available recipe categories
**So that** I can present valid options to users and validate input before creating recipes

#### Acceptance Criteria

```gherkin
Feature: recipe_categories MCP tool

  Scenario: List available categories
    Given I have an OAuth token with recipes:read scope
    When I call the recipe_categories tool
    Then I receive a list of valid category names
    And the list is sorted alphabetically

  Scenario: Use categories for validation
    Given I fetched categories and received ["breakfast", "desserts", "entrees", ...]
    When a user wants to create a recipe in "entrees"
    Then I can confirm "entrees" is a valid category before calling recipe_create
```

---

## Out of Scope

- Creating new categories (manual `mkdir` for now)
- Category metadata (descriptions, icons)
- Category counts (use recipe_list for that)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Categories returned | All valid categories listed | Manual test |
| Sorted output | Alphabetically ordered | Manual test |

---

## Open Questions

- [x] Required scope: `recipes:read` or none? → `recipes:read` (read operation, consistent pattern)

---

## References

- `src/lib/recipes/loader.ts` - `getCategories()` function
- `src/mcp/tools/recipes.ts` - Existing tool patterns
