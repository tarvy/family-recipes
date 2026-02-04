# PR-033: Recipe Detail Responsive Layout - Requirements

> **Status**: Draft
> **PR Branch**: `feat/033-recipe-detail-responsive`
> **Dependencies**: None

---

## Problem Statement

When viewing a recipe on mobile, users must scroll repeatedly between the ingredients list and the instructions. This creates a frustrating cooking experience, especially when hands are messy or wet. In landscape orientation, there's enough screen width to show both sections simultaneously, but the current layout doesn't adapt.

Additionally, ingredients mentioned inline within recipe steps lack context—users see "add the flour" but must scroll up to remember how much flour.

---

## User Stories

### Story 1: Side-by-Side Layout in Landscape

**As a** home cook using my phone while cooking
**I want** to see ingredients and instructions side by side when I rotate my phone to landscape
**So that** I can follow the recipe without scrolling back and forth

#### Acceptance Criteria

```gherkin
Feature: Landscape two-column layout

  Scenario: Phone rotated to landscape on recipe detail
    Given I am viewing a recipe detail page
    And my device is in portrait orientation
    When I rotate my device to landscape
    Then the layout changes to two columns
    And ingredients appear in the left column
    And instructions appear in the right column
    And both columns are independently scrollable

  Scenario: Tablet in landscape
    Given I am viewing a recipe detail page on a tablet
    And the viewport width is >= 768px
    When I view the page in landscape orientation
    Then the two-column layout is displayed
    And the content is readable without zooming

  Scenario: Return to portrait
    Given I am viewing a recipe in landscape two-column layout
    When I rotate back to portrait orientation
    Then the layout returns to single-column (stacked)
    And no content is lost or hidden
```

### Story 2: Tappable Inline Ingredients

**As a** home cook following recipe steps
**I want** to tap on ingredient names within instructions to see their full measurement
**So that** I don't have to scroll up to the ingredients list

#### Acceptance Criteria

```gherkin
Feature: Interactive inline ingredients

  Scenario: Tap ingredient in step text
    Given I am viewing a recipe with step text containing "flour"
    And the recipe has an ingredient "2 cups all-purpose flour"
    When I tap on the word "flour" in the step text
    Then a tooltip/popover appears showing "2 cups all-purpose flour"
    And the tooltip includes the scaled quantity if servings are adjusted

  Scenario: Ingredient highlighted visually
    Given I am viewing a recipe step
    When ingredient names appear in the step text
    Then they are visually distinct (underlined or colored)
    And they appear tappable/interactive

  Scenario: Dismiss tooltip
    Given I have a tooltip open for an ingredient
    When I tap outside the tooltip
    Or I tap the ingredient again
    Then the tooltip closes

  Scenario: Scaled quantities in tooltip
    Given I have adjusted the servings multiplier to 2×
    And I tap an ingredient showing "1 cup flour"
    Then the tooltip shows "2 cups flour" (scaled amount)
```

---

## Out of Scope

- Desktop-specific layouts (focus is mobile/tablet landscape)
- Ingredient checking/strikethrough (future feature)
- Voice control or hands-free mode
- Print-friendly layouts
- Step-by-step "cook mode" with timers

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Landscape usability | No scrolling between ingredients/steps | Manual testing |
| Ingredient tap accuracy | 95%+ successful taps register | User feedback |
| No layout shift | CLS < 0.1 on orientation change | Lighthouse |

---

## Open Questions

- [x] Should the multiplier controls be in the left column header? → Yes, keep with ingredients
- [ ] What happens to header/meta info in landscape? → Collapse or hide?
- [ ] Should equipment section be in left column with ingredients?
- [ ] Tooltip vs popover vs bottom sheet for ingredient details?

---

## References

- Current recipe detail: `src/app/(main)/recipes/[slug]/page.tsx`
- Ingredient list: `src/components/recipes/scalable-ingredient-list.tsx`
- Step list: `src/components/recipes/step-list.tsx`
- Data types: `src/db/types/index.ts` (IStep has ingredients array)
