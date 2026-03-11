# PR-054: Public Voting Page + Home Widget - Requirements

> **Status**: Draft
> **PR Branch**: `feat/054-voting-home-widget`
> **Dependencies**: PR-052 (Weekly Menu API)

---

## Problem Statement

Family members can plan meals (PR-053), but there's no way for the broader household to vote on what they want to eat. Guests, kids, partners who don't use the app need a frictionless way to weigh in. Today, the only option is verbal communication. This PR adds two surfaces: a public voting page reachable by shared link (no account required), and a compact home widget that shows the finalized week's plan on the main recipes page.

---

## User Stories

### Story 1: Household member votes on meal candidates

**As a** household member (possibly without an account)
**I want** to open a shared link and vote on proposed recipes
**So that** my preferences are counted in the family's meal plan

#### Acceptance Criteria

```gherkin
Feature: Public voting page

  Scenario: Voter opens voting link
    Given I have a link to /vote/[token]
    And the menu status is "survey-sent"
    When I open the link in my browser
    Then I see candidate recipe cards from the week's assignments
    And I am not prompted to sign in

  Scenario: Voter selects recipes and submits
    Given I am on the voting page
    When I tap recipe cards to select my favorites
    And I enter my display name
    And I tap "Submit Vote"
    Then my votes are recorded via the API
    And I see a confirmation message

  Scenario: Returning voter replaces previous vote
    Given I previously voted from this browser
    When I open the same voting link
    And I change my selections and submit
    Then my previous vote is replaced (not duplicated)
    And the replacement uses my browser fingerprint for identification

  Scenario: Voter with same fingerprint auto-populates name
    Given I previously voted from this browser
    When I open the voting link again
    Then my display name field is pre-filled
    And my previous selections are highlighted
```

### Story 2: Voting page handles closed/finalized states

**As a** household member opening an old voting link
**I want** to see a clear message when voting is no longer possible
**So that** I understand the plan has been finalized

#### Acceptance Criteria

```gherkin
Feature: Voting closed states

  Scenario: Menu is locked-in
    Given the weekly menu status is "locked-in"
    When I open /vote/[token]
    Then I see a "Voting Closed" page
    And the page shows the finalized meal plan (read-only)
    And no vote submission is possible

  Scenario: Voting deadline has passed
    Given votingClosesAt is in the past
    And the menu status is still "survey-sent"
    When I open /vote/[token]
    Then I see "Voting has ended"
    And no vote submission is possible

  Scenario: Invalid token
    Given I open /vote/[invalid-token]
    When the page loads
    Then I see a "Not found" message
```

### Story 3: Browser fingerprint identifies repeat voters

**As the** system
**I want** to identify returning voters by browser fingerprint
**So that** one device gets one vote (replaceable, not stackable)

#### Acceptance Criteria

```gherkin
Feature: Browser fingerprint voter identification

  Scenario: Fingerprint generated on first visit
    Given I visit /vote/[token] for the first time
    When the page loads
    Then a browser fingerprint is generated from canvas, screen, and timezone data
    And the fingerprint is stored in memory (not persisted client-side)

  Scenario: Same browser produces consistent fingerprint
    Given I visit the voting page from the same browser
    When the page generates a fingerprint
    Then the hash matches my previous visit's hash
    And submitting replaces my previous vote

  Scenario: Different browser produces different fingerprint
    Given I open the voting link in Chrome and then Safari
    When each browser generates a fingerprint
    Then the two hashes differ
    And each browser can submit an independent vote
```

### Story 4: Home widget shows finalized weekly plan

**As a** family member on the recipes page
**I want** to see this week's meal plan at a glance
**So that** I know what's planned without navigating to the planner

#### Acceptance Criteria

```gherkin
Feature: Home widget on recipes page

  Scenario: Widget appears when locked-in menu exists
    Given a WeeklyMenu for the current ISO week has status "locked-in"
    When I load the /recipes page
    Then a compact 7-day meal strip appears above the recipe grid
    And today is visually highlighted

  Scenario: Widget not rendered without locked-in menu
    Given no locked-in WeeklyMenu exists for the current week
    When I load the /recipes page
    Then the home widget is not visible
    And the recipe grid takes full vertical space

  Scenario: Tapping a recipe in the widget navigates to detail
    Given the home widget is showing today's recipe
    When I tap the recipe thumbnail
    Then I navigate to /recipes/[slug]

  Scenario: Widget shows each day's assignment
    Given a locked-in menu has recipes assigned to 5 of 7 days
    When I view the widget
    Then 5 days show recipe thumbnails with truncated titles
    And 2 days show an empty state
    And today's cell has a pink highlight
```

---

## Out of Scope

- Planner page UI and drag-and-drop (PR-053)
- Email/SMS delivery of voting links (manual sharing for now)
- Vote result analytics or visualization
- Widget for "building" or "survey-sent" status menus
- Push notifications for new votes
- Any new API endpoints (PR-052 provides voting and menu endpoints)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Voting page loads without auth | Zero auth redirects or cookies sent | Browser DevTools network inspection |
| Vote submission works | Creates/replaces vote via API | Manual test + API response check |
| Fingerprint consistency | Same hash on same browser across visits | Console log comparison |
| Home widget conditional render | Only appears with locked-in current week | Test with and without locked-in menu |
| Lint + typecheck pass | Zero errors | `npm run lint && npm run typecheck` |

---

## Open Questions

- [x] Auth requirement for voting? **None.** Public route, no sign-in needed.
- [x] How to identify repeat voters? **Browser fingerprint** (canvas + screen + timezone hash)
- [x] Where does the home widget live? **Top of /recipes page**, above recipe grid
- [x] Widget for non-locked-in menus? **No.** Only locked-in menus get the widget.
