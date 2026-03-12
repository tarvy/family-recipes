# PR-057: Menu Publish Flow & Calendar-Style Menu Navigation - Requirements

> **Status**: Draft
> **PR Branch**: `feat/057-publish-flow`
> **Dependencies**: PR-053 (Planner Page UI), PR-056 (Card Fan Stacking)

---

## Problem Statement

The current menu workflow uses a "Send Survey" action that generates a voting URL but has no mechanism to actually deliver it. The `survey-sent` → `locked-in` state machine auto-creates a shopping list on finalize, removing user control. There is no place in the app to browse menus, and the voting system is disconnected from any discoverable UI.

The workflow should be simplified: menus are **published** (making them visible to family), **voted on** by anyone who can see them, **edited** only by their creator, and **manually sent to the shopping list** when the owner decides.

---

## User Stories

### Story 1: Publish a Menu

**As a** meal planner (owner/family role)
**I want** to publish my weekly menu so family members can see it
**So that** everyone knows what's planned for the week

#### Acceptance Criteria

```gherkin
Feature: Publish a menu

  Scenario: Publishing a menu with assignments
    Given I have a menu in "building" status
    And the menu has at least 1 recipe assignment
    When I tap the "Publish" button
    Then the menu status changes to "published"
    And the menu becomes visible to other family members on the menu page

  Scenario: Cannot publish an empty menu
    Given I have a menu in "building" status
    And the menu has 0 recipe assignments
    When I view the planner actions
    Then the "Publish" button is disabled or shows a validation message

  Scenario: Unpublishing a menu
    Given I have a published menu that I own
    When I tap "Unpublish"
    Then the menu status returns to "building"
    And the menu is no longer visible to other family members
```

### Story 2: Calendar-Style Menu Navigation

**As a** family member
**I want** to browse menus by week like a calendar
**So that** I can see current plans and look back at previous weeks

#### Acceptance Criteria

```gherkin
Feature: Calendar-style menu navigation

  Scenario: Default view shows current week
    Given I navigate to the /menu page
    Then I see the current week's menu (mine or the first published one)
    And the week switcher highlights the current week

  Scenario: Browsing to previous weeks
    Given I am on the menu page
    When I navigate to a previous week
    Then I see the menu that existed for that week (if any)
    And past-week menus are read-only (no drag-and-drop editing)

  Scenario: Browsing to next week
    Given I am on the menu page
    When I navigate to next week
    Then I see my menu for next week (created on demand)
    And I can edit it if it's mine and still current/future

  Scenario: Seeing family members' published menus
    Given another family member has published a menu for this week
    When I view the menu page for that week
    Then I see their published menu in a "Family Menus" section
    And I can view their full weekly layout and vote on it

  Scenario: One menu per user per week
    Given I already have a menu for week "2026-W12"
    When I navigate to that week
    Then I see my existing menu (no duplicate created)
```

### Story 3: Vote on a Published Menu

**As a** family member (any authenticated user)
**I want** to vote on recipes in a published menu
**So that** the meal planner knows which meals the family is excited about

#### Acceptance Criteria

```gherkin
Feature: Vote on published menu

  Scenario: Casting a vote
    Given I am viewing a published menu
    When I tap the vote/heart/thumbs-up on a recipe assignment
    Then my vote is recorded
    And the vote count updates immediately

  Scenario: Changing my vote
    Given I previously voted on a recipe in this menu
    When I tap the vote toggle again
    Then my vote is removed

  Scenario: Owner sees vote counts
    Given I own a published menu and family members have voted
    When I view the menu (planner or published detail)
    Then I see vote counts per recipe assignment
```

### Story 4: Owner Edits Published Menu

**As a** menu owner
**I want** to continue editing my menu after publishing
**So that** I can adjust the plan based on votes or availability

#### Acceptance Criteria

```gherkin
Feature: Edit published menu

  Scenario: Owner adds/removes recipes on published menu
    Given I own a menu in "published" status
    When I open the planner for that week
    Then the drag-and-drop editing is still functional
    And I can add and remove recipe assignments

  Scenario: Non-owner cannot edit
    Given a menu is published by another user
    When I view the published menu detail
    Then I see recipes and can vote
    But I do not see edit controls or drag-and-drop
```

### Story 5: Send Published Menu to Shopping List

**As a** menu owner
**I want** to add the menu's ingredients to my existing shopping list
**So that** everything I need to buy is in one place and I control when it's added

#### Acceptance Criteria

```gherkin
Feature: Send to shopping list (append)

  Scenario: Appending to an existing active shopping list
    Given I own a published menu with recipe assignments
    And I have an active shopping list
    When I tap "Send to Shopping List"
    Then the menu's aggregated ingredients are added to my existing shopping list
    And I see a confirmation with a link to the shopping list
    And the menu remains in "published" status (not locked)
    And existing items in the shopping list are not modified or deduplicated

  Scenario: No active shopping list exists
    Given I own a published menu with recipe assignments
    And I have no active shopping list
    When I tap "Send to Shopping List"
    Then a new shopping list is created with the menu's ingredients
    And I see a confirmation with a link to the new list

  Scenario: Sending the same menu again
    Given I previously sent this menu's items to the shopping list
    When I tap "Send to Shopping List" again
    Then the items are appended again (duplicates are the user's responsibility)
    And the user manages list accuracy manually
```

---

## Out of Scope

- Push notifications or email delivery of published menus (future PR)
- Anonymous/unauthenticated voting (all voters must be logged in for now)
- Voting on individual meal slots (votes are per-assignment)
- Real-time live updates (standard page refresh to see new votes)
- `locked-in` status removal (will coexist for backward compatibility, just unused in new flow)
- Shopping list item deduplication or quantity merging on append (user manages accuracy)
- Automatic menu archival cron/cleanup (menus persist indefinitely, past weeks are read-only by convention)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Publish flow works end-to-end | 100% | Manual test: build → publish → browse → vote → send to list |
| Family menus visible on /menu | Other users' published menus shown | Manual test |
| Voting records and displays | Vote counts visible | Manual test |
| Shopping list items appended | Menu ingredients added to active list | Compare item count before/after |
| Lint + typecheck pass | 0 errors | `npm run lint && npm run typecheck` |

---

## Open Questions

- [x] ~~Should "Send to Shopping List" replace the old shopping list or create a new one each time?~~ **Resolved**: Append items to the user's active shopping list. If none exists, create one. No dedup — user manages accuracy.
- [ ] Should published menus show in the home widget differently than building menus?
- [x] ~~Navigation: where does the Published Menus page live?~~ **Resolved**: Within the existing `/menu` page. Week switcher becomes calendar-style navigation. Family members' published menus shown in a section below the planner.
- [ ] Week switcher UX: extend the current 2-tab pill to support browsing more weeks, or replace with a different calendar-style control?

---

## References

- Current state machine: `src/lib/menu/service.ts` (sendSurvey, cancelSurvey, finalizeMenu, unlockMenu)
- Current model: `src/db/models/weekly-menu.model.ts`
- Current planner actions: `src/components/menu/planner-actions.tsx`
- Current status badge: `src/components/menu/status-badge.tsx`
