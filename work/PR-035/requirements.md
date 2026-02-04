# PR-035: MongoDB-Primary Recipe API - Requirements

> **Status**: Approved
> **PR Branch**: `feat/035-mongodb-primary-recipe-api`
> **Dependencies**: PR-032 (MongoDB-Primary Architecture)

---

## Problem Statement

The web API routes for recipe CRUD operations (`/api/recipes` and `/api/recipes/[slug]`) currently write directly to the filesystem. This approach:

1. **Fails on Vercel production** - deployed filesystem is read-only
2. **Creates inconsistency** - MCP tools use MongoDB, web API uses filesystem
3. **Violates architecture** - MongoDB should be the source of truth

Users see an error when saving recipe edits in the web app because `writeRawCooklangContent()` cannot write to the filesystem in production.

---

## User Stories

### Story 1: Edit Recipe in Web App

**As a** family member
**I want** to edit recipes using the web interface
**So that** I can fix typos or update ingredients without needing terminal access

#### Acceptance Criteria

```gherkin
Feature: Recipe editing via web app

  Scenario: Successfully edit and save recipe
    Given I am logged in
    And I am on the edit page for "lemon-chicken-soup"
    When I modify the recipe content
    And I click "Save Changes"
    Then the recipe is saved to MongoDB
    And I am redirected to the recipe detail page
    And the changes are visible immediately

  Scenario: Edit recipe title (slug change)
    Given I am editing "old-recipe-name"
    When I change the title to "New Recipe Name"
    And I save the recipe
    Then the slug changes to "new-recipe-name"
    And the old slug no longer exists
    And I am redirected to "/recipes/new-recipe-name"

  Scenario: Handle duplicate title
    Given a recipe "existing-recipe" already exists
    When I try to create a new recipe with the same title
    Then I see an error "Recipe with slug 'existing-recipe' already exists"
    And no recipe is created
```

### Story 2: Create Recipe in Web App

**As a** family member
**I want** to create new recipes using the web interface
**So that** I can add recipes from any device

#### Acceptance Criteria

```gherkin
Feature: Recipe creation via web app

  Scenario: Successfully create new recipe
    Given I am logged in
    And I am on the new recipe page
    When I enter valid Cooklang content with title and steps
    And I select a category
    And I click "Create Recipe"
    Then the recipe is saved to MongoDB
    And I am redirected to the new recipe's detail page
```

---

## Out of Scope

- Git sync/export functionality (manual process if needed)
- Recipe deletion via web UI (can be added later)
- Bulk import/export features

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Recipe save success rate | 100% | No errors on save in production |
| API parity with MCP | Full | Same repository functions used |

---

## Open Questions

- [x] Should DELETE endpoint also be updated? → Yes, for consistency

---

## References

- `src/lib/recipes/repository.ts` - MongoDB CRUD operations
- `src/mcp/tools/recipes.ts` - MCP tools using repository
- `docs/ARCHITECTURE.md` - Data flow documentation
