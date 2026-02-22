# PR-045: Recipe Tile Styling Consistency - Requirements

> **Status**: Draft
> **PR Branch**: `fix/recipe-tile-consistency`
> **Dependencies**: PR-044

---

## Problem Statement

Recipe tiles in the "new categories" section (filtered list via RecipeGrid) have different dimensions and styling than tiles in the curated sections (Random, Most Used, etc. via RecipeSection). This creates a visually inconsistent experience. The RecipeSection tiles use a fixed 256px (w-64) width and gap-4; RecipeGrid uses fluid widths and gap-6, producing narrower/taller cards and inconsistent appearance.

---

## User Stories

### Story 1: Visual consistency across recipe lists

**As a** recipe browser
**I want** recipe tiles to have consistent dimensions and spacing in both the curated sections and the filtered list
**So that** the page feels cohesive and professional

#### Acceptance Criteria

```gherkin
Feature: Recipe tile consistency

  Scenario: Tiles match across sections
    Given I am on the recipes page
    And I can see the Random section (horizontal scroll)
    And I can see the filtered recipe grid below
    When I view both sections
    Then recipe cards in both sections have the same width standard (256px / 16rem min)
    And both sections use the same gap (16px / gap-4)

  Scenario: No harsh truncation in horizontal scroll
    Given I am on the recipes page
    And the Random section has multiple cards
    When the rightmost card is partially visible at viewport edge
    Then a fade hint indicates scrollability
    Or sufficient padding prevents harsh cut-off
```

---

## Out of Scope

- Changing RecipeCard internal layout or content
- Adding new features to recipe display
- Modifying section data loading

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Card width alignment | Grid cards ≥ 256px min, match section cards | Visual inspection, devtools |
| Gap consistency | Same gap in both layouts | gap-4 in RecipeGrid and RecipeSection |
| Scroll UX | No harsh truncation or clear scroll hint | Visual inspection |

---

## References

- work/PR-044/design.md (RecipeSection card standard: w-64, gap-4)
