# PR-061 — Weekly-Menu MCP Tools

## Problem

The MCP server exposes recipe and shopping-list tools but has **no coverage of
the weekly meal-plan (menu) domain**. The owner's primary desired workflow —
planning the week's dinners through the connector from any Claude conversation —
is impossible through MCP today. The menu domain is already service-extracted
(`src/lib/menu/service.ts`) and exposed over REST (`/api/menu*`); MCP just needs
thin wrappers, matching the "MCP wraps the API/service" goal.

## Scope

In: read + build + lifecycle MCP tools for weekly menus, new `menu:read` /
`menu:write` scopes, consent-page + docs coverage, a unit test, and removing the
duplicated MCP user-resolver.

Out (tracked separately): auth-context threading / authz parity (PR-062),
retiring the git-sync pipeline (PR-063), connector productionization and the
mcp-auth DNS work (PR-064).

## Acceptance Criteria (BDD)

```gherkin
Scenario: New menu scopes are grantable and shown on consent
  Given the OAuth scopes recipes/shopping exist
  When menu:read and menu:write are added to OAUTH_SCOPES
  Then VALID_SCOPES includes them
  And the /authorize consent page renders them without a code change

Scenario: View the current week's plan
  Given an authenticated client with menu:read
  When it calls menu_get_week with no weekLabel
  Then it receives the current week's menu, created empty if none existed
  And each assignment includes an assignmentId

Scenario: Add a recipe to a night
  Given an authenticated client with menu:write
  When it calls menu_add_dinner with a valid recipeSlug and day
  Then the recipe is scheduled on that day (mealSlot defaults to dinner)
  And the updated menu is returned

Scenario: Invalid recipe slug is rejected
  When menu_add_dinner is called with an unknown recipeSlug
  Then the tool returns an error naming the missing slug

Scenario: Remove a scheduled recipe
  Given a menu in building status with an assignment
  When menu_remove_assignment is called with its assignmentId
  Then the assignment is removed and the updated menu is returned

Scenario: Finalize into a shopping list
  Given a menu in survey-sent status
  When menu_finalize is called
  Then the menu becomes locked-in and a shopping list id is returned

Scenario: Read tools cannot mutate
  Then menu_get_week requires only menu:read, never menu:write
```

## Non-goals / constraints

- Do not bypass menu lifecycle invariants (building → survey-sent → locked-in);
  wrap the service, don't reach around it.
- No DB integration-test harness exists in this repo; unit-test the pure
  serializer and the scope wiring only (matches existing test convention).
