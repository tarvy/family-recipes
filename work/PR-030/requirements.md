# PR-030: Add `recipe_update` MCP Tool - Requirements

> **Status**: Approved
> **PR Branch**: `feat/030-recipe-update-tool`
> **Dependencies**: PR-029 (recipe_create tool)

---

## Problem Statement

Users need to update existing recipes via MCP. This includes modifying content, changing titles (which changes the slug), and moving recipes between categories.

---

## User Stories

### Story 1: Update Recipe Content

**As an** AI assistant user
**I want** to update an existing recipe's content
**So that** I can fix typos, adjust quantities, or add steps

#### Acceptance Criteria

```gherkin
Feature: recipe_update MCP tool

  Scenario: Update recipe content
    Given I have an OAuth token with recipes:write scope
    And a recipe exists at "entrees/chicken-parmesan.cook"
    When I call recipe_update with slug "chicken-parmesan", new content, and category "entrees"
    Then the file content is replaced with the new content
    And the response includes success: true

  Scenario: Update with title change (slug change)
    Given a recipe exists with slug "old-name"
    When I call recipe_update with new content containing ">> title: New Name"
    Then the old file "old-name.cook" is deleted
    And a new file "new-name.cook" is created
    And the response includes the new slug

  Scenario: Move recipe to different category
    Given a recipe exists at "entrees/dish.cook"
    When I call recipe_update with category "sides"
    Then the file is moved to "sides/dish.cook"

  Scenario: Recipe not found
    Given no recipe exists with slug "nonexistent"
    When I call recipe_update with that slug
    Then the request fails with "Recipe not found" error
```

---

## Out of Scope

- Partial updates (always full content replacement)
- MongoDB sync (handled separately)
- Version history/undo

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Content update works | File content replaced | Manual test |
| Slug change works | Old file deleted, new created | Manual test |
| Category move works | File in new location | Manual test |

---

## Open Questions

- [x] Handle slug collision on rename? → Fail with error (don't overwrite)

---

## References

- `src/lib/recipes/writer.ts` - `writeRawCooklangContent()`, `deleteRecipeFile()`
- `src/lib/recipes/loader.ts` - `getRawCooklangContent()` for existence check
- PR-029 - recipe_create pattern
