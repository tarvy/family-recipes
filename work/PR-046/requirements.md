# PR-046: Recipe Rating & Cook Log - Requirements

> **Status**: Approved
> **PR Branch**: `feat/recipe-rating-cook-log`
> **Dependencies**: None

---

## Problem Statement

Users want to rate recipes (1-5 stars) and track when they've cooked them, with historical stats and optional notes per cook. This is family-wide (not per-user) — one shared rating and cook log for the whole family.

---

## User Stories

### Story 1: Rate a recipe

**As a** family member
**I want** to rate a recipe with 1-5 stars
**So that** we remember which recipes the family likes best

#### Acceptance Criteria

```gherkin
Feature: Recipe rating

  Scenario: Rate a recipe
    Given I am on a recipe detail page
    When I click the 4th star
    Then the recipe shows 4 filled stars
    And the rating persists on page reload

  Scenario: Clear a rating
    Given a recipe has a 4-star rating
    When I click the 4th star again
    Then the rating is cleared (no stars filled)

  Scenario: Change a rating
    Given a recipe has a 3-star rating
    When I click the 5th star
    Then the recipe shows 5 filled stars
```

### Story 2: Log a cook

**As a** family member
**I want** to record when I cooked a recipe with an optional note
**So that** we can track cooking history and remember tips

#### Acceptance Criteria

```gherkin
Feature: Cook log

  Scenario: Log a cook with a note
    Given I am on a recipe detail page
    When I click "I Cooked This!"
    And I enter a note "Used extra garlic"
    And I submit
    Then the cook log shows the entry with today's date and the note

  Scenario: Log a cook without a note
    Given I am on a recipe detail page
    When I click "I Cooked This!"
    And I submit without entering a note
    Then the cook log shows the entry with today's date

  Scenario: View cook history
    Given a recipe has been cooked 3 times
    When I view the recipe detail page
    Then I see a summary "Cooked 3 times"
    And I see the list of cook entries with dates and notes
```

---

## Out of Scope

- Per-user ratings (this is family-wide)
- Editing or deleting individual cook log entries
- Sorting/filtering recipes by rating
- Rating display on recipe cards (list view)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Rating persistence | Rating survives page reload | Manual verification |
| Cook log persistence | Entries survive page reload | Manual verification |
| Type safety | No TypeScript errors | `npm run typecheck` |
| Lint clean | No lint violations | `npm run lint` |
