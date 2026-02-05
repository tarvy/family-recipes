# PR-036: Active Cooking Timers - Requirements

> **Status**: Draft
> **PR Branch**: `feat/036-active-cooking-timers`
> **Dependencies**: None

---

## Problem Statement

When cooking from recipes, users frequently need to track multiple timers (e.g., "simmer for 15 minutes", "bake for 45 minutes"). Currently, timer information is displayed as static badges in recipe steps, requiring users to:

1. Manually start timers on their phone or kitchen timer
2. Remember which timer belongs to which recipe/step
3. Switch between multiple recipe tabs when cooking multiple dishes

This creates friction in the cooking experience, especially when preparing multi-course meals.

---

## User Stories

### Story 1: Start Timer from Recipe Step

**As a** home cook
**I want** to start a countdown timer by clicking on timer badges in recipe steps
**So that** I don't have to manually set timers on another device

#### Acceptance Criteria

```gherkin
Feature: Start timer from recipe step

  Scenario: Start a single timer
    Given I am viewing a recipe with timer "~{15%minutes}" in step 3
    When I click on the "15 minutes" timer badge
    Then a countdown timer starts with 15:00
    And the timer badge shows it is active (visual indicator)
    And the active timers panel appears at the bottom

  Scenario: Start multiple timers from same recipe
    Given I have started a timer for step 3
    When I click on a different timer badge in step 5
    Then both timers run simultaneously
    And both appear in the active timers panel

  Scenario: Timer badge shows remaining time
    Given I have an active timer with 10 minutes remaining
    When I view the recipe step
    Then the timer badge shows "10:00" instead of "15 minutes"
    And the badge has a pulsing/active visual state
```

### Story 2: Monitor Active Timers

**As a** home cook
**I want** to see all my active timers in one place
**So that** I can monitor multiple timers while navigating between recipes

#### Acceptance Criteria

```gherkin
Feature: Active timers panel

  Scenario: View active timers
    Given I have 2 active timers running
    When I look at the bottom of any page
    Then I see a collapsed panel showing "2 Active Timers"
    When I tap to expand the panel
    Then I see both timers with:
      - Recipe name
      - Step preview (first ~50 characters)
      - Remaining time (countdown format: MM:SS)
      - Pause/resume button
      - Cancel button

  Scenario: Timers persist across navigation
    Given I have an active timer on "Pasta Primavera"
    When I navigate to "Apple Pie" recipe
    Then the timer continues running
    And the active timers panel still shows the timer

  Scenario: Timers persist across page refresh
    Given I have an active timer with 10:00 remaining
    When I refresh the page
    Then the timer resumes at approximately 10:00
    And the countdown continues
```

### Story 3: Timer Completion Notification

**As a** home cook
**I want** to be alerted when a timer completes
**So that** I don't miss important cooking steps

#### Acceptance Criteria

```gherkin
Feature: Timer completion notification

  Scenario: Visual notification on completion
    Given I have an active timer
    When the timer reaches 0:00
    Then a notification toast appears
    And the toast shows recipe name and step
    And the timer status changes to "completed"

  Scenario: Audio notification (optional)
    Given I have enabled sound notifications
    When a timer completes
    Then a pleasant chime sound plays
    And the visual notification also appears

  Scenario: Dismiss completed timer
    Given a timer has completed
    When I click "Dismiss" on the notification
    Then the notification disappears
    And the timer is removed from the active list
```

### Story 4: Timer Controls

**As a** home cook
**I want** to pause, resume, and cancel timers
**So that** I can adjust for real-time cooking needs

#### Acceptance Criteria

```gherkin
Feature: Timer controls

  Scenario: Pause and resume timer
    Given I have an active timer at 5:00
    When I click the pause button
    Then the timer pauses at 5:00
    And the button changes to "resume"
    When I click resume after 30 seconds
    Then the timer resumes at 5:00 (not 4:30)

  Scenario: Cancel timer
    Given I have an active timer
    When I click the cancel button
    Then the timer is removed
    And it no longer appears in the panel
```

### Story 5: Pin Recipes for Quick Access

**As a** home cook preparing multiple dishes
**I want** to pin recipes I'm actively using
**So that** I can quickly switch between them while cooking

#### Acceptance Criteria

```gherkin
Feature: Pinned recipes

  Scenario: Pin a recipe
    Given I am viewing a recipe detail page
    When I click the "Pin" button
    Then the recipe is added to my pinned list
    And the button changes to "Unpin"
    And the recipe appears in the active timers panel

  Scenario: Access pinned recipes
    Given I have pinned "Pasta Primavera" and "Apple Pie"
    When I expand the active timers panel
    Then I see a "Pinned Recipes" section
    And I can click on either recipe to navigate to it

  Scenario: Unpin a recipe
    Given I have pinned a recipe
    When I click "Unpin" on the recipe detail page
    Then the recipe is removed from my pinned list
```

---

## Out of Scope

- Server-side timer sync (timers are device-local only)
- Timer presets or saved timer templates
- Integration with smart home devices
- Sharing timers across devices
- Timer snooze functionality
- Named/custom timers (only Cooklang-defined timers)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Timer start rate | >50% of timer badges clicked | Future analytics |
| Timer completion rate | >80% of started timers reach completion | Future analytics |
| Session duration | Increase on recipe pages | Future analytics |

---

## Open Questions

- [x] Should timers work without login? → Yes, uses localStorage (device-local)
- [x] Where should panel be positioned? → Fixed bottom bar
- [x] Should there be a timer limit? → No artificial limit, UI handles ~10 gracefully
- [ ] Should we request notification permission proactively or lazily?

---

## References

- `src/components/recipes/interactive-step-list.tsx` - Timer badge rendering
- `src/components/pwa/pwa-provider.tsx` - PWA context pattern
- `src/app/(main)/shopping-list/shopping-list-client.tsx` - localStorage pattern
- `docs/COOKLANG.md` - Timer syntax documentation
