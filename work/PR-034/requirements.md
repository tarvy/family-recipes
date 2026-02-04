# PR-034: Recipe Detail Width-Based Responsive Layout - Requirements

> **Status**: Draft
> **PR Branch**: `feat/034-recipe-detail-width-responsive`
> **Dependencies**: PR-033 (Responsive Layout Foundation)

---

## Problem Statement

PR-033 introduced a responsive two-column layout for recipe details that activates in **landscape orientation**. However, this leaves significant unused space on:

1. **Desktop browsers** - Always report portrait orientation, never trigger two-column layout
2. **Tablets in portrait** - Wide enough for side-by-side but orientation-gated
3. **Large phones in portrait** - Some devices (iPhone Plus/Max) have sufficient width

The current approach optimizes for one use case (phone in landscape) but ignores the broader opportunity: **any viewport wide enough to display both panels should use the space efficiently**.

Users cooking with a recipe benefit from keeping ingredients visible while scrolling instructions. This is true regardless of device orientation.

---

## User Stories

### Story 1: Width-Based Two-Column Layout

**As a** home cook viewing a recipe on any device
**I want** the layout to show ingredients and instructions side-by-side when there's enough screen width
**So that** I can reference ingredients while following steps without scrolling

#### Key Test Case: iPhone 13 Mini Landscape

The iPhone 13 Mini in landscape (812x375) is the baseline device:
- **Width (812px)**: Exceeds 768px breakpoint → should trigger two-column
- **Height (375px)**: Below PR-033's 480px threshold → currently broken

If it works on iPhone 13 Mini landscape, it will work on any larger iPhone/device.

#### Acceptance Criteria

```gherkin
Feature: Width-based responsive recipe layout

  Scenario: iPhone 13 Mini in landscape (primary test case)
    Given I am viewing a recipe on iPhone 13 Mini
    And the device is in landscape orientation (812x375)
    When the page loads
    Then ingredients and instructions display side by side
    And ingredients panel is on the left (sticky)
    And instructions panel is on the right (scrollable)
    And I can scroll instructions while keeping ingredients visible

  Scenario: Desktop browser viewing recipe
    Given I am viewing a recipe detail page
    And my browser window is >= 768px wide
    When the page loads
    Then ingredients and instructions display side by side
    And ingredients panel is on the left
    And instructions panel is on the right
    And both panels scroll independently

  Scenario: Tablet in portrait orientation
    Given I am viewing a recipe on a tablet in portrait mode
    And the viewport width is >= 768px
    When the page loads
    Then the two-column layout is displayed
    And I do not need to rotate to landscape

  Scenario: Phone in portrait (narrow)
    Given I am viewing a recipe on a phone in portrait
    And the viewport width is < 768px
    When the page loads
    Then the layout is single-column (stacked)
    And ingredients appear above instructions

  Scenario: Phone rotated to landscape (wide enough)
    Given I am viewing a recipe on a phone
    And the landscape width is >= 768px
    When I rotate to landscape
    Then the two-column layout activates
    And I can see both ingredients and steps simultaneously

  Scenario: Small phone in landscape (narrow)
    Given I am viewing a recipe on a small phone (e.g., iPhone SE)
    And the landscape width is < 768px (667px)
    When I rotate to landscape
    Then the layout remains single-column
    And content uses available width efficiently

  Scenario: Browser window resized
    Given I am viewing a recipe in two-column layout
    When I resize the browser window below 768px
    Then the layout smoothly transitions to single-column
    And no content is lost
```

### Story 2: Sticky Ingredients Panel

**As a** home cook scrolling through long recipe instructions
**I want** the ingredients list to stay visible as I scroll
**So that** I can always see what I need without scrolling back

#### Acceptance Criteria

```gherkin
Feature: Sticky ingredients in wide layout

  Scenario: Scrolling instructions in two-column layout
    Given I am viewing a recipe in two-column layout
    And the instructions are longer than the viewport height
    When I scroll down through the instructions
    Then the ingredients panel remains visible (sticky)
    And the ingredients panel scrolls independently if needed

  Scenario: Short recipe in two-column layout
    Given I am viewing a recipe with few instructions
    When the entire recipe fits on screen
    Then both panels display without scroll
    And the layout does not force unnecessary scrolling
```

### Story 3: Collapsed Header in Wide Layout (Optional)

**As a** home cook in active cooking mode
**I want** the recipe header to be compact in wide layouts
**So that** more space is available for ingredients and instructions

#### Acceptance Criteria

```gherkin
Feature: Compact header in wide layout

  Scenario: Wide viewport shows condensed header
    Given I am viewing a recipe in two-column layout
    Then the header (title, meta, tags) is more compact
    And the category badge and tags may collapse or relocate
    And the title remains prominently visible
```

---

## Out of Scope

- Print-friendly layouts (future PR)
- Full-screen "cook mode" with step-by-step progression (future PR)
- Voice control or hands-free navigation
- Ingredient checking/strikethrough while cooking
- Dark mode specific styling (covered by existing theme)
- Remembering user preference for layout mode

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Two-column on desktop | 100% of wide viewports | Manual testing |
| Ingredients always visible | No scroll to see ingredients while reading steps | Manual testing |
| No layout shift | CLS < 0.1 on resize/orientation change | Lighthouse |
| Responsive transition | Smooth animation between layouts | Visual inspection |

---

## Open Questions

- [ ] Should there be a breakpoint between tablet (768px) and desktop (1024px) with different proportions?
- [x] Keep orientation-based trigger for phones? → Yes, as fallback for narrow-but-landscape scenarios
- [ ] Should header collapse be a separate PR or included here?
- [ ] Maximum content width on very wide screens (1400px+)?

---

## References

- PR-033: Landscape orientation layout (foundation)
- Current components:
  - `src/components/recipes/recipe-content-layout.tsx`
  - `src/components/recipes/recipe-detail-client.tsx`
  - `src/app/(main)/recipes/[slug]/page.tsx`
- Tailwind v4 docs for responsive design
