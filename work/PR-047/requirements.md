# PR-047: Stable Random Recipes

## Problem
The "Random" section on the recipes page re-rolls on every page load because it uses MongoDB `$sample`. This creates a jarring UX where the section constantly changes.

## Solution
Persist the random selection in a cookie for 24 hours, and add a shuffle button so users can manually re-roll when they want variety.

## Acceptance Criteria

### Scenario: Stable random recipes across page loads
- Given a user visits the recipes page
- When the page loads with no existing cookie
- Then a fresh random set is generated via `$sample`
- And the slugs are stored in a `random-recipes` cookie (24hr TTL)
- When the user refreshes the page
- Then the same random recipes appear

### Scenario: Manual shuffle
- Given a user is viewing the recipes page with a cached random set
- When they click the shuffle button in the Random section header
- Then the cookie is cleared
- And the page refreshes with a new random set
- And the new set is persisted in the cookie

### Scenario: Cookie expiry
- Given 24 hours have passed since the cookie was set
- When the user visits the recipes page
- Then a fresh random set is generated
