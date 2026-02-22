# PR-044: Recipe List Sections (Most Used, Recently Added, Recently Used, Random)

> **Status**: Draft
> **PR Branch**: `feat/recipe-list-sections`
> **Dependencies**: None

---

## Problem Statement

The main recipe list (`/recipes`) shows a flat grid of all recipes with filtering. Users want curated sections that surface recipes by different dimensions: most frequently used, recently added, recently used, and random picks. This improves discoverability and helps families quickly find favorites and new additions.

---

## User Stories

### Story 1: Browse by Usage

**As a** family cook
**I want** to see "Most Used" and "Recently Used" recipe sections on the main recipes page
**So that** I can quickly find recipes the family cooks often and ones I looked at recently

#### Acceptance Criteria

```gherkin
Feature: Recipe list sections

  Scenario: Most Used section displays top recipes
    Given recipes exist with varying useCount values
    When I visit the recipes page
    Then I see a "Most Used" section
    And the section shows 4–8 recipes sorted by useCount descending
    And I can horizontally scroll the section on mobile

  Scenario: Recently Used section displays recently viewed recipes
    Given recipes have been viewed (lastUsedAt populated)
    When I visit the recipes page
    Then I see a "Recently Used" section
    And the section shows 4–8 recipes sorted by lastUsedAt descending
    And recipes with null lastUsedAt are excluded

  Scenario: Recently Used section is hidden when empty
    Given no recipes have been viewed yet
    When I visit the recipes page
    Then the "Recently Used" section is not displayed

  Scenario: Most Used section is hidden when all useCount is zero
    Given all recipes have useCount of 0
    When I visit the recipes page
    Then the "Most Used" section is not displayed
```

### Story 2: Browse by Recency and Discovery

**As a** family cook
**I want** to see "Recently Added" and "Random" recipe sections
**So that** I can discover new additions and get inspiration from a random pick

#### Acceptance Criteria

```gherkin
  Scenario: Recently Added section displays newest recipes
    Given recipes exist with createdAt timestamps
    When I visit the recipes page
    Then I see a "Recently Added" section
    And the section shows 4–8 recipes sorted by createdAt descending

  Scenario: Random section displays shuffled recipes
    Given recipes exist
    When I visit the recipes page
    Then I see a "Random" section
    And the section shows 4–8 recipes in random order
    And refreshing the page may show different recipes
```

### Story 3: Usage Tracking

**As a** system
**I want** to record when a recipe is viewed
**So that** "Most Used" and "Recently Used" sections have accurate data

#### Acceptance Criteria

```gherkin
  Scenario: Recipe view increments usage
    Given a recipe exists
    When a user loads the recipe detail page (/recipes/[slug])
    Then useCount is incremented by 1
    And lastUsedAt is set to the current timestamp
    And the page renders normally (tracking does not block or delay)

  Scenario: Multiple views accumulate
    Given a recipe has useCount 5 and lastUsedAt of yesterday
    When a user loads the recipe detail page
    Then useCount becomes 6
    And lastUsedAt is updated to now
```

---

## Out of Scope

- Per-user personalization of "Recently Used" / "Most Used" (global family-wide for now)
- Deduplication of rapid repeated views (e.g., same user refreshing within N seconds)
- Configurable section order or visibility in UI
- Section preferences stored per user

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Sections render | 4 sections visible when data exists | Manual check |
| Mobile horizontal scroll | Smooth scroll, no layout overflow | Manual at 375px |
| Usage recording | useCount increments on detail view | Manual / log check |
| Section size | 4–8 recipes per section | Code constant, default 6 |

---

## Open Questions

- [ ] Should "Most Used" show when all values are 0? (Design: hide it)
- [ ] Should "Random" be deterministic per request or truly random? (Design: random per request)

---

## References

- `docs/ARCHITECTURE.md` – Recipe schema, data flow
- `src/components/recipes/recipe-browser.tsx` – Current recipe list
- `src/lib/recipes/loader.ts` – Recipe preview loading
