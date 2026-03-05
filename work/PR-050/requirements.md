# PR-050: Role-Based Access Control & Public Recipe Sharing - Requirements

> **Status**: Approved
> **PR Branch**: `feat/050-rbac-public-sharing`
> **Dependencies**: None

---

## Problem Statement

The application has three user tiers (owner, family, friend) but only enforces role restrictions on recipe DELETE and admin routes. Friends (non-family signed-in users) can currently create, edit, rate, upload photos, and use the shopping list -- all of which should be restricted. Additionally, there's no way to share a recipe link with someone who doesn't have an account.

---

## User Stories

### Story 1: Family member uses full functionality

**As a** family member (owner or family role)
**I want** full access to create, edit, delete recipes and use the shopping list
**So that** I can contribute to and manage our family recipe collection

#### Acceptance Criteria

```gherkin
Feature: Family member full access

  Scenario: Family member creates a recipe
    Given I am signed in with role "family" or "owner"
    When I navigate to /recipes/new or POST /api/recipes
    Then the recipe is created successfully

  Scenario: Family member edits a recipe
    Given I am signed in with role "family" or "owner"
    When I PUT /api/recipes/[slug] with updated content
    Then the recipe is updated successfully

  Scenario: Family member uses shopping list
    Given I am signed in with role "family" or "owner"
    When I navigate to /shopping-list
    Then I see the full shopping list functionality

  Scenario: Family member sees all action menu options
    Given I am signed in with role "family" or "owner"
    When I view a recipe detail page
    Then I see Edit, Pin, Cover Photo, and Delete options
```

### Story 2: Non-family user has read-only access

**As a** non-family user (friend role)
**I want** to browse and read recipes, rate them, and log cooks
**So that** I can use the recipe collection without modifying it

#### Acceptance Criteria

```gherkin
Feature: Friend read-only access

  Scenario: Friend cannot create a recipe
    Given I am signed in with role "friend"
    When I POST /api/recipes
    Then I receive a 403 Forbidden response

  Scenario: Friend cannot edit a recipe
    Given I am signed in with role "friend"
    When I PUT /api/recipes/[slug]
    Then I receive a 403 Forbidden response

  Scenario: Friend cannot access shopping list
    Given I am signed in with role "friend"
    When I navigate to /shopping-list
    Then I am redirected away (or shown "not available")

  Scenario: Friend cannot upload photos
    Given I am signed in with role "friend"
    When I POST /api/photos/upload
    Then I receive a 403 Forbidden response

  Scenario: Friend can rate a recipe
    Given I am signed in with role "friend"
    When I POST /api/recipes/[slug]/rate
    Then the rating is saved successfully

  Scenario: Friend can log a cook
    Given I am signed in with role "friend"
    When I POST /api/recipes/[slug]/cook-log
    Then the cook log entry is saved successfully

  Scenario: Friend sees limited action menu
    Given I am signed in with role "friend"
    When I view a recipe detail page
    Then I see only Pin option (no Edit, Cover Photo, Delete)

  Scenario: Friend does not see Shopping List in navigation
    Given I am signed in with role "friend"
    When I view the navigation drawer
    Then Shopping List link is not visible
```

### Story 3: Anonymous user views shared recipe

**As an** anonymous user (not signed in)
**I want** to view a recipe via a shared link
**So that** I can read a recipe someone sent me without creating an account

#### Acceptance Criteria

```gherkin
Feature: Public recipe sharing

  Scenario: Anonymous user views shared recipe
    Given I have a link to /r/[slug]
    And I am not signed in
    When I open the link
    Then I see the recipe title, description, ingredients, and steps
    And I do NOT see any interactive features (pin, edit, delete, rate, cook log, cover photo)
    And I do NOT see any navigation to other parts of the app
    And no user session data is exposed in the page

  Scenario: Shared recipe for non-existent slug
    Given I have a link to /r/nonexistent-recipe
    When I open the link
    Then I see a "Recipe not found" message

  Scenario: Public recipe page has no auth cookies or user data
    Given I am viewing /r/[slug]
    When I inspect the page source and network requests
    Then no session cookies are sent to the page
    And no user-specific data appears in the HTML
    And no API calls requiring auth are made
```

---

## Out of Scope

- Changing the allowlist storage from MongoDB to a JSON file (MongoDB works fine)
- Adding a UI for managing the allowlist (already exists at /api/admin/allowlist)
- Changing the invite system
- Adding a "copy share link" button to the recipe UI (future PR)
- Timer functionality on public recipe page (explicitly excluded)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Friend role blocked on all write APIs | 100% of write endpoints return 403 | Manual API testing |
| Public recipe page loads without auth | Zero auth-related network requests | Browser DevTools inspection |
| No user data leakage on public page | Zero user-specific data in HTML | View source inspection |
| Lint + typecheck pass | Zero errors | `npm run lint && npm run typecheck` |

---

## Open Questions

- [x] Should friends be able to rate/log cooks? **Yes** -- account presence required but not family membership
- [x] URL pattern for public recipes? **/r/[slug]** -- clean separation from authenticated routes
