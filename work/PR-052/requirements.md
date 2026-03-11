# PR-052: Weekly Meal Planning, API Layer - Requirements

> **Status**: Draft
> **PR Branch**: `feat/052-meal-plan-api`
> **Dependencies**: PR-051 (data models and discovery pipeline)

---

## Problem Statement

PR-051 created the data models and cleaning pipeline, but nothing is accessible from the frontend yet. Families need REST endpoints to build weekly menus, manage recipe assignments, run voting surveys, finalize menus into shopping lists, and browse discovery recipes. This PR builds the complete API layer: menu repository, menu service, discovery service, ingredient validator, and 14 route files covering 15 endpoints.

---

## User Stories

### Story 1: Family member manages a weekly menu

**As a** family member
**I want** to create, view, and delete weekly menus via the API
**So that** I can plan our meals for any given week

#### Acceptance Criteria

```gherkin
Feature: Weekly menu CRUD

  Scenario: Get current week menu (auto-create)
    Given I am signed in with any role
    When I GET /api/menu without a ?week= parameter
    Then a menu for the current ISO week is returned
    And if no menu existed, one is created with status "building"

  Scenario: Get menu for specific week
    Given I am signed in
    When I GET /api/menu?week=2026-W15
    Then the menu for that week is returned
    And if no menu existed, one is created for week 2026-W15

  Scenario: Create menu for specific week
    Given I am signed in with role "family" or "owner"
    When I POST /api/menu with body { "weekLabel": "2026-W20" }
    Then a new menu is created for week 2026-W20 with status "building"
    And the weekStartDate is set to the Monday of that week

  Scenario: Delete menu in building status
    Given a menu exists with status "building"
    And I am signed in with role "family" or "owner"
    When I DELETE /api/menu/[id]
    Then the menu is deleted
    And a 200 response confirms deletion

  Scenario: Delete menu in locked-in status fails
    Given a menu exists with status "locked-in"
    And I am signed in with role "family" or "owner"
    When I DELETE /api/menu/[id]
    Then a 409 Conflict response is returned
    And the menu is not deleted

  Scenario: Friend cannot create or delete menus
    Given I am signed in with role "friend"
    When I POST /api/menu or DELETE /api/menu/[id]
    Then a 403 Forbidden response is returned
```

### Story 2: Family member manages recipe assignments

**As a** family member
**I want** to add and remove recipes from the weekly menu
**So that** I can build our meal plan for the week

#### Acceptance Criteria

```gherkin
Feature: Menu assignments

  Scenario: Add cookbook recipe to menu
    Given a menu in "building" status
    And I am signed in with role "family" or "owner"
    When I POST /api/menu/[id]/assignments with:
      | recipeId | title | thumbnailUrl | source | day | mealSlot |
    Then the assignment is added to the menu
    And source is "cookbook"

  Scenario: Add discovery recipe to menu
    Given a menu in "building" status
    And I am signed in with role "family" or "owner"
    When I POST /api/menu/[id]/assignments with:
      | discoveryRecipeId | title | thumbnailUrl | source | day | mealSlot |
    Then the assignment is added to the menu
    And source is "discovery"

  Scenario: Remove assignment from menu
    Given a menu in "building" status with 3 assignments
    And I am signed in with role "family" or "owner"
    When I DELETE /api/menu/[id]/assignments with body { "assignmentId": "..." }
    Then the assignment is removed
    And the other 2 assignments remain

  Scenario: Cannot modify assignments on locked-in menu
    Given a menu with status "locked-in"
    When I POST or DELETE /api/menu/[id]/assignments
    Then a 409 Conflict response is returned

  Scenario: mealSlot defaults to dinner
    Given I POST an assignment without specifying mealSlot
    Then mealSlot is set to "dinner"
```

### Story 3: Family member runs a voting survey

**As a** family member
**I want** to send a voting survey to the family and later cancel it if needed
**So that** everyone gets a say in what we cook this week

#### Acceptance Criteria

```gherkin
Feature: Voting survey lifecycle

  Scenario: Send survey from building status
    Given a menu with status "building" and at least 1 assignment
    And I am signed in with role "family" or "owner"
    When I POST /api/menu/[id]/survey
    Then status changes to "survey-sent"
    And a unique votingToken is generated
    And votingOpenedAt is set to now
    And votingClosesAt is set to 24 hours from now
    And the response includes the votingToken and a votingUrl

  Scenario: Cancel survey
    Given a menu with status "survey-sent"
    And I am signed in with role "family" or "owner"
    When I DELETE /api/menu/[id]/survey
    Then status reverts to "building"
    And votingToken, votes, votingOpenedAt, votingClosesAt are all cleared

  Scenario: Cannot send survey on locked-in menu
    Given a menu with status "locked-in"
    When I POST /api/menu/[id]/survey
    Then a 409 Conflict response is returned

  Scenario: Cannot send survey with zero assignments
    Given a menu with status "building" and 0 assignments
    When I POST /api/menu/[id]/survey
    Then a 400 Bad Request response is returned
    And the message explains that at least one assignment is needed
```

### Story 4: Anyone with the link votes on meals

**As a** family member or guest with a voting link
**I want** to view the menu and submit my picks without signing in
**So that** voting is frictionless for everyone, including people without accounts

#### Acceptance Criteria

```gherkin
Feature: Public voting

  Scenario: View voting page
    Given a valid votingToken for a menu in "survey-sent" status
    When I GET /api/vote/[token]
    Then I receive the list of assignments, isOpen flag, and votingClosesAt
    And no authentication is required

  Scenario: Submit vote
    Given a valid votingToken for an open survey
    When I POST /api/vote/[token] with { voterName, picks }
    Then the vote is recorded
    And picks is an array of assignment IDs the voter prefers

  Scenario: Duplicate vote replaces previous
    Given voter "Mom" already voted on this menu
    When "Mom" submits a new vote with the same voterToken
    Then the previous vote is replaced (not duplicated)

  Scenario: Vote after voting window closes
    Given a menu where votingClosesAt is in the past
    When I POST /api/vote/[token]
    Then a 410 Gone response is returned
    And the vote is not recorded

  Scenario: Invalid voting token
    Given a token that doesn't match any menu
    When I GET or POST /api/vote/[token]
    Then a 404 Not Found response is returned
```

### Story 5: Family member finalizes the menu

**As a** family member
**I want** to finalize the menu and generate a shopping list
**So that** I can go grocery shopping with everything I need

#### Acceptance Criteria

```gherkin
Feature: Menu finalization

  Scenario: Finalize creates shopping list
    Given a menu with status "survey-sent" and assignments
    And all discovery recipe ingredients are parseable
    And I am signed in with role "family" or "owner"
    When I POST /api/menu/[id]/finalize
    Then status changes to "locked-in"
    And a shopping list is created with ingredients from all assigned recipes
    And finalizedAt is set to now
    And response includes shoppingListId

  Scenario: Finalize with unparseable discovery ingredients
    Given a menu with a discovery recipe whose ingredients can't be parsed
    When I POST /api/menu/[id]/finalize
    Then status still changes to "locked-in"
    And the shopping list is created from cookbook recipes + parseable discovery recipes
    And unparseable discovery recipes are excluded from the shopping list
    And response includes alerts: [{ recipeTitle, reason }]

  Scenario: Unlock finalized menu
    Given a menu with status "locked-in"
    And I am signed in with role "family" or "owner"
    When I POST /api/menu/[id]/unlock
    Then status reverts to "building"
    And all votes are cleared
    And the linked shopping list is deleted
    And shoppingListId is cleared from the menu

  Scenario: Cannot finalize a building menu
    Given a menu with status "building"
    When I POST /api/menu/[id]/finalize
    Then a 409 Conflict response is returned
```

### Story 6: Family member browses discovery recipes

**As a** family member
**I want** to browse and search pre-fetched external recipes
**So that** I can find new meals to add to our weekly menu

#### Acceptance Criteria

```gherkin
Feature: Discovery recipe browsing

  Scenario: List discovery recipes with pagination
    Given 200 discovery recipes exist with qualityScore >= 60
    When I GET /api/discovery?page=1&limit=20
    Then I receive 20 recipes sorted by qualityScore descending
    And the response includes total count and page number

  Scenario: Search discovery recipes
    Given discovery recipes exist with various titles and tags
    When I GET /api/discovery?q=thai+chicken
    Then I receive recipes matching "thai chicken" in title or tags
    And results are paginated

  Scenario: Track discovery state
    Given I am signed in
    When I POST /api/discovery/[id]/state with { action: "saved" }
    Then a UserDiscoveryState record is created or updated
    And the response confirms success

  Scenario: Trigger discovery refresh
    Given I am signed in with role "owner"
    When I POST /api/discovery/refresh
    Then the system re-fetches from TheMealDB
    And the response includes counts: { added, updated, total }

  Scenario: Non-owner cannot trigger refresh
    Given I am signed in with role "family"
    When I POST /api/discovery/refresh
    Then a 403 Forbidden response is returned
```

---

## Out of Scope

- Frontend UI for menu building, voting, or discovery (PR-053)
- Shopping list finalization UI and alerts display (PR-054)
- WebSocket or real-time updates for voting
- Email or push notifications for survey links
- Recipe recommendation engine or personalization
- Batch assignment operations (add/remove multiple at once)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| All 15 endpoints respond correctly | 100% | Manual API testing via curl/Postman |
| State transitions enforced | No invalid transitions possible | Test each forbidden transition returns 409 |
| Finalize creates valid shopping list | Cookbook + parseable discovery included | Verify shopping list contents |
| Public vote works without auth | Zero auth headers needed | Test GET/POST /api/vote/[token] unauthenticated |
| Lint + typecheck pass | Zero errors | `npm run lint && npm run typecheck` |

---

## Open Questions

- [x] Should finalize require survey-sent status? **Yes.** Can't finalize directly from building. The flow is building → survey-sent → locked-in.
- [x] How does fingerprint dedup work for votes? **voterToken field.** Frontend generates a stable browser fingerprint sent with each vote. Same voterToken replaces the previous vote.
- [x] What happens to the shopping list on unlock? **Deleted.** The linked shopping list is removed, shoppingListId cleared.
- [x] 24h voting window fixed or configurable? **Fixed at 24 hours for now.** Can be made configurable later.

---

## References

- PR-051: Data models and discovery pipeline (prerequisite)
- PR-053: Frontend UI (consumes these APIs)
- PR-054: Shopping list finalization UI
- Existing API pattern: `src/app/api/shopping-list/route.ts`
- Auth utilities: `src/lib/auth/authorization.ts`, `src/lib/auth/session.ts`
- Shopping list service: `src/lib/shopping/service.ts`
- Ingredient aggregator: `src/lib/shopping/aggregator.ts`
