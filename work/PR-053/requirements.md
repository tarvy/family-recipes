# PR-053: Planner Page UI + Drag-and-Drop - Requirements

> **Status**: Draft
> **PR Branch**: `feat/053-planner-page-dnd`
> **Dependencies**: PR-052 (Weekly Menu API)

---

## Problem Statement

The weekly meal planning feature needs a visual interface where family members can browse recipes, drag them onto specific days, and manage their week's menu. No such page exists yet. PR-052 provides the API layer (CRUD endpoints, assignment mutations, status transitions), but there's nothing for humans to interact with. This PR builds the entire `/menu` planner page: recipe browsing, custom drag-and-drop, day/meal slot assignments, card fanning for stacked recipes, a carousel overlay, week switching, and status-driven action buttons.

---

## User Stories

### Story 1: Family member drags a recipe onto a day

**As a** family member
**I want** to drag a recipe card from the source panel onto a day row
**So that** I can visually build the week's meal plan

#### Acceptance Criteria

```gherkin
Feature: Drag-and-drop recipe assignment

  Scenario: Drag recipe to day row assigns dinner by default
    Given I am on the /menu page with a "building" menu
    And the recipe source panel shows available recipes
    When I press and drag a recipe card onto the "Monday" row
    And I release the pointer
    Then the recipe is assigned to Monday dinner
    And a POST request creates the assignment via the API
    And the recipe card appears in Monday's row

  Scenario: Ghost element follows pointer during drag
    Given I am dragging a recipe card
    When I move my pointer across the screen
    Then a semi-transparent ghost of the card follows the pointer
    And the ghost is scaled to 75% of the original
    And the ghost does not intercept pointer events

  Scenario: Drag cancelled by releasing outside any target
    Given I am dragging a recipe card
    When I release the pointer outside any day row
    Then the ghost disappears
    And no assignment is created
```

### Story 2: Family member targets a specific meal slot via hover

**As a** family member
**I want** day rows to expand into meal slot columns when I hover during a drag
**So that** I can assign recipes to breakfast, lunch, or dinner specifically

#### Acceptance Criteria

```gherkin
Feature: 700ms hover expansion to meal slots

  Scenario: Hovering over a day row expands meal columns
    Given I am dragging a recipe card
    When I hold the pointer over "Tuesday" for 700 milliseconds
    Then the Tuesday row expands horizontally into three columns
    And the columns are labeled "Breakfast", "Lunch", "Dinner"

  Scenario: Dropping on a specific meal slot
    Given I am dragging a recipe card
    And the "Wednesday" row has expanded to show meal slots
    When I drop the card on the "Lunch" column
    Then the recipe is assigned to Wednesday lunch

  Scenario: Meal slots collapse after drop
    Given the "Wednesday" row is expanded showing meal slots
    When I drop a card or move the pointer away
    Then the row collapses back to its default compact view

  Scenario: Quick drop before expansion assigns dinner
    Given I am dragging a recipe card
    When I drop the card on "Thursday" before 700ms elapses
    Then the recipe is assigned to Thursday dinner (default slot)
```

### Story 3: Family member views stacked recipes as a card fan

**As a** family member
**I want** multiple recipes in one slot to fan out visually
**So that** I can see at a glance how many recipes are assigned and browse them

#### Acceptance Criteria

```gherkin
Feature: SW-to-NE card fan for stacked recipes

  Scenario: Multiple recipes in one slot render as fanned cards
    Given Monday dinner has three assigned recipes
    When I view the Monday row
    Then the three cards are stacked in a fan pattern
    And each successive card is offset toward the top-right
    And the newest card sits on top

  Scenario: Tapping a fanned stack opens carousel overlay
    Given a meal slot has a fanned stack of recipe cards
    When I tap the stack
    Then a full-screen carousel overlay opens
    And the carousel shows each recipe card
    And I can swipe horizontally between cards

  Scenario: Dismissing the carousel overlay
    Given the carousel overlay is open
    When I tap outside the carousel area
    Then the overlay closes
    And the planner page is visible again

  Scenario: Swiping down dismisses the carousel
    Given the carousel overlay is open
    When I swipe downward on the overlay
    Then the overlay dismisses with a slide-down animation
```

### Story 4: Family member navigates to a recipe and returns

**As a** family member
**I want** to tap a single recipe card to view its full details
**So that** I can read ingredients and steps before committing to the plan

#### Acceptance Criteria

```gherkin
Feature: State preservation across navigation

  Scenario: Tap single card navigates to recipe detail
    Given a day row has exactly one assigned recipe
    When I tap the recipe card
    Then I navigate to /recipes/[slug]

  Scenario: Back navigation restores planner state
    Given I navigated to a recipe detail from the planner
    When I press the browser back button
    Then I return to the /menu page
    And the active source tab is restored
    And the search query is restored
    And the scroll position is restored

  Scenario: Ephemeral state persists via sessionStorage
    Given I have selected the "Discovery" tab and typed "curry"
    When I navigate away from /menu and return
    Then the "Discovery" tab is still selected
    And the search input shows "curry"
```

### Story 5: Family member switches between weeks

**As a** family member
**I want** to toggle between "This Week" and "Next Week"
**So that** I can plan ahead without losing the current week's progress

#### Acceptance Criteria

```gherkin
Feature: Week switcher with independent state

  Scenario: Switching to next week loads its menu
    Given I am viewing "This Week" with 3 assigned recipes
    When I tap "Next Week"
    Then the calendar grid shows next week's assignments
    And the status badge reflects next week's menu status

  Scenario: Each week has independent status
    Given "This Week" is locked-in
    And "Next Week" is in building status
    When I switch between tabs
    Then action buttons change per week's status
```

### Story 6: Family member uses status-driven actions

**As a** family member
**I want** the planner actions to reflect the current menu status
**So that** I can send surveys, finalize, or unlock the plan at the right time

#### Acceptance Criteria

```gherkin
Feature: Status-driven planner actions

  Scenario: Building status shows Send Survey button
    Given the current week's menu status is "building"
    When I view the planner actions area
    Then I see a "Send Survey" button

  Scenario: Survey-sent status shows Cancel and Finalize
    Given the current week's menu status is "survey-sent"
    When I view the planner actions area
    Then I see "Cancel Survey" and "Finalize" buttons

  Scenario: Locked-in status shows Unlock button
    Given the current week's menu status is "locked-in"
    When I view the planner actions area
    Then I see an "Unlock & Edit" button
```

### Story 7: Planner page works on mobile

**As a** family member on my phone
**I want** the planner page to be usable at 375px width
**So that** I can plan meals from my phone

#### Acceptance Criteria

```gherkin
Feature: Mobile responsive planner

  Scenario: Layout adapts to 375px viewport
    Given my viewport is 375px wide
    When I load the /menu page
    Then the recipe source panel scrolls horizontally
    And day rows stack vertically
    And drag-and-drop works via touch pointer events

  Scenario: Recipe cards are readable on mobile
    Given my viewport is 375px wide
    When I view the recipe source panel
    Then each card shows a thumbnail and truncated title
    And cards are large enough to tap and drag
```

---

## Out of Scope

- Voting/survey UI (PR-054 handles the public voting page)
- Home page widget showing the finalized plan (PR-054)
- Recipe discovery/recommendation algorithms (future work)
- Reordering recipes within a meal slot
- Multi-week views beyond "This Week" and "Next Week"
- Shopping list generation from the meal plan
- Any new API endpoints (PR-052 provides all needed endpoints)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Drag-and-drop creates assignment | Works on Chrome, Safari, Firefox | Manual testing on each browser |
| 700ms hover triggers meal slot expansion | Consistent timing across devices | Manual testing + visual confirmation |
| Card fan renders correctly with 1, 2, 3+ cards | Correct offset pattern | Visual inspection at each count |
| State preserved after navigation | All ephemeral UI restored | Navigate away and back, verify tab/search/scroll |
| Mobile usable at 375px | All features accessible | Chrome DevTools device emulation |
| Lint + typecheck pass | Zero errors | `npm run lint && npm run typecheck` |

---

## Open Questions

- [x] Drag library? **Custom Pointer Events** (matches existing gesture patterns, no external dependency)
- [x] Default meal slot when no hover expansion? **Dinner**
- [x] Max recipes per meal slot? **No hard limit** (card fan handles visual stacking)
- [x] State persistence strategy? **sessionStorage for ephemeral UI, MongoDB for assignments**
