# PR-011: Recipe UI - List & Search - Requirements

> **Status**: Draft
> **PR Branch**: `feat/011-recipe-list-search`
> **Dependencies**: PR-009 (Cooklang Integration), PR-010 (Recipe Migration)

---

## Problem Statement

We have 84 recipes converted to Cooklang format across 6 meal-type categories, but no way to browse or search them in the web application. Users need a recipe browsing interface to discover, filter, and find recipes.

---

## User Stories

### Story 1: Browse All Recipes

**As a** family member
**I want** to see all available recipes in a visual grid
**So that** I can discover what's available to cook

#### Acceptance Criteria

```gherkin
Feature: Recipe browsing

  Scenario: View all recipes
    Given I am on the recipes page
    When the page loads
    Then I see a grid of recipe cards
    And each card shows the recipe title
    And each card shows the category (entrees, desserts, etc.)
    And each card shows prep/cook time if available

  Scenario: Navigate to recipe detail
    Given I am on the recipes page
    When I click on a recipe card
    Then I navigate to the recipe detail page
```

### Story 2: Filter Recipes by Category

**As a** family member
**I want** to filter recipes by meal type
**So that** I can find recipes for a specific meal (dinner, dessert, etc.)

#### Acceptance Criteria

```gherkin
Feature: Category filtering

  Scenario: Filter by single category
    Given I am on the recipes page
    And there are recipes in multiple categories
    When I select "Entrees" from the category filter
    Then I only see recipes from the entrees category
    And the URL updates to reflect the filter

  Scenario: Clear category filter
    Given I have "Entrees" filter active
    When I click "All" or clear the filter
    Then I see recipes from all categories
```

### Story 3: Search Recipes

**As a** family member
**I want** to search recipes by keyword
**So that** I can find recipes by name or ingredient

#### Acceptance Criteria

```gherkin
Feature: Recipe search

  Scenario: Search by title
    Given I am on the recipes page
    When I type "chicken" in the search box
    Then I see recipes with "chicken" in the title
    And results update as I type (debounced)

  Scenario: Search by ingredient
    Given I am on the recipes page
    When I search for "garlic"
    Then I see recipes that contain garlic as an ingredient

  Scenario: No results
    Given I am on the recipes page
    When I search for "xyznonexistent"
    Then I see a "No recipes found" message
    And I see a suggestion to clear filters
```

### Story 4: Mobile-Responsive Layout

**As a** family member using my phone
**I want** to browse recipes on a mobile device
**So that** I can find recipes while at the grocery store

#### Acceptance Criteria

```gherkin
Feature: Mobile responsiveness

  Scenario: Mobile grid layout
    Given I am on the recipes page on a mobile device (< 640px)
    Then I see a single-column grid of recipe cards
    And cards are full width with touch-friendly tap targets

  Scenario: Tablet grid layout
    Given I am on the recipes page on a tablet (640px - 1024px)
    Then I see a 2-column grid of recipe cards

  Scenario: Desktop grid layout
    Given I am on the recipes page on desktop (> 1024px)
    Then I see a 3 or 4 column grid of recipe cards
```

---

## Out of Scope

- Recipe detail view (PR-012)
- Recipe create/edit (PR-013)
- Favoriting recipes
- Recipe history/recently viewed
- Sorting options (by name, by time, etc.)
- Pagination (will load all recipes initially, optimize later if needed)
- Photo thumbnails (recipes don't have photos yet)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| All recipes visible | 84 recipes displayed | Manual count in grid |
| Category filter works | 6 categories filter correctly | Manual test each category |
| Search finds matches | Returns relevant results | Search for "chicken", "soup", "dessert" |
| Mobile responsive | Grid adapts at breakpoints | Test at 375px, 768px, 1280px |

---

## Open Questions

- [x] Should filters persist in URL? **Yes - for shareability**
- [x] Should search be client-side or API-based? **Client-side initially (84 recipes is small), can move to API later**
- [ ] What's the placeholder for recipes without photos? Category-based icon or generic food image?

---

## References

- Existing Cooklang parser: `src/lib/cooklang/parser.ts`
- Recipe model: `src/db/models/recipe.model.ts`
- Recipe data: `recipes/` directory (84 .cook files)
- Category structure: entrees (53), desserts (17), soups (6), sides (6), salads (1), breakfast (1)
