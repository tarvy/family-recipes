# PR-041: Recipe Quantity Fraction Display - Requirements

> **Status**: Draft
> **PR Branch**: `feat/fraction-display-imperial`
> **Dependencies**: None

---

## Problem Statement

Recipe ingredient quantities are displayed using decimal notation (e.g., 0.25 cup, 0.5 tsp, 0.75 cup) when parsed from Cooklang sources. This is less readable and less familiar for home cooks, who expect fraction notation (¼ cup, ½ tsp, ¾ cup) for imperial volume measurements. Metric measurements (g, kg, ml, L) should remain in decimal form since metric convention does not use fractions.

---

## User Stories

### Story 1: Cook Views Scaled Ingredients

**As a** home cook viewing a recipe
**I want** ingredient quantities in teaspoon, tablespoon, and cup measurements to display as fractions (¼, ½, ¾, etc.)
**So that** the display matches familiar recipe formats and measuring-cup markings

#### Acceptance Criteria

```gherkin
Feature: Fraction display for imperial volume units

  Scenario: Decimal quantity displays as fraction for cup
    Given a recipe with @flour{0.25%cup}
    When I view the recipe ingredients list at 1x scale
    Then I see "¼ cup flour"
    And I do not see "0.25 cup flour"

  Scenario: Decimal quantity displays as fraction for teaspoon
    Given a recipe with @salt{0.5%tsp}
    When I view the recipe ingredients list at 1x scale
    Then I see "½ tsp salt"
    And I do not see "0.5 tsp salt"

  Scenario: Decimal quantity displays as fraction for tablespoon
    Given a recipe with @oil{0.75%tbsp}
    When I view the recipe ingredients list at 1x scale
    Then I see "¾ tbsp oil"
    And I do not see "0.75 tbsp oil"

  Scenario: Scaled quantity displays as fraction
    Given a recipe with @flour{0.5%cup} at 1x scale
    When I increase the scale multiplier to 2x
    Then I see "1 cup flour"
    And not "1.0 cup flour"

  Scenario: Whole numbers remain as integers
    Given a recipe with @eggs{2} or @flour{2%cup}
    When I view the recipe ingredients list
    Then I see "2 eggs" or "2 cup flour"
    And quantities are not modified
```

### Story 2: Metric Measurements Stay Decimal

**As a** cook using metric measurements
**I want** gram and milliliter quantities to display as decimals
**So that** the display matches metric convention and measuring tools

#### Acceptance Criteria

```gherkin
Feature: Metric quantities retain decimal display

  Scenario: Gram quantity displays as decimal
    Given a recipe with @flour{250%g}
    When I view the recipe ingredients list
    Then I see "250 g flour" or "250g flour"
    And I do not see fraction notation for grams

  Scenario: Milliliter quantity displays as decimal
    Given a recipe with @milk{125%ml}
    When I view the recipe ingredients list
    Then I see "125 ml milk"
    And decimals like 0.5 remain "0.5" not "½"
```

### Story 3: Tooltip Consistency

**As a** cook clicking an ingredient in the recipe steps
**I want** the ingredient tooltip to show the same fraction notation as the ingredients list
**So that** the display is consistent throughout the recipe

#### Acceptance Criteria

```gherkin
Feature: Tooltip fraction display consistency

  Scenario: Tooltip shows fraction for imperial volume
    Given a recipe step referencing @flour{0.25%cup}
    When I click the ingredient name in the step text
    Then the tooltip shows "¼ cup flour"
    And matches the ingredients list display
```

---

## Out of Scope

- Expanding fraction display to ounce, pound, or other imperial units (limit to tsp, tbsp, cup per user preference)
- Fraction display in Cooklang source files (we format at display time only)
- Fraction display in shopping list aggregation (evaluate in future PR if desired)
- Unicode vulgar fractions beyond common set: ¼, ⅓, ½, ⅔, ¾ (⅛, ⅜, etc. can be added later if needed)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Imperial volume decimals converted | 100% for tsp/tbsp/cup | Manual check on recipe with 0.25, 0.5, 0.75 values |
| Metric unchanged | 100% | Verify g, ml display as decimals |
| No regression | 0 broken displays | Existing recipes (Pudding Mix Chocolate Chip Cookies, etc.) still render correctly |

---

## Open Questions

- [x] Limited to tsp, tbsp, cup per user input
- [ ] Add ounce (oz) to fraction units? (Deferred - user said "perhaps those are the only ones")

---

## References

- `docs/COOKLANG.md` - Ingredient syntax
- `src/lib/shopping/aggregator.ts` - formatAmount, parseQuantity
- `src/components/recipes/scalable-ingredient-list.tsx` - Main display component
- `src/components/recipes/ingredient-tooltip.tsx` - Tooltip display
