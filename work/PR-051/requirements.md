# PR-051: Weekly Meal Planning, Data Foundation + Discovery Pipeline - Requirements

> **Status**: Draft
> **PR Branch**: `feat/051-meal-plan-data-discovery`
> **Dependencies**: None (first PR in 4-PR meal planning feature set)

---

## Problem Statement

The app stores family recipes but offers no way to plan meals for the week. Families end up texting back and forth about what to cook, buying duplicate groceries, and repeating the same meals. The weekly meal planning feature fixes this by letting families build a menu, discover new recipes from TheMealDB, vote on favorites, and generate a shopping list.

This PR lays the data foundation: three new MongoDB models, TypeScript interfaces, and a complete TheMealDB data cleaning pipeline. No UI, no API routes. Pure data layer that PR-052 through PR-054 build on.

---

## User Stories

### Story 1: System stores weekly menu state

**As a** family member
**I want** the system to track our weekly menu with assignments, votes, and status
**So that** we have a single source of truth for what we're cooking each week

#### Acceptance Criteria

```gherkin
Feature: Weekly menu data model

  Scenario: Menu created for a specific week
    Given no menu exists for week "2026-W11"
    When the system creates a WeeklyMenu for that week
    Then it has ownerId, weekLabel "2026-W11", weekStartDate of Monday
    And status defaults to "building"
    And assignments and votes arrays are empty

  Scenario: Menu enforces one-per-week-per-owner
    Given a menu already exists for owner "abc123" and week "2026-W11"
    When the system tries to create another menu for the same owner and week
    Then a duplicate key error is thrown
    And only one menu exists for that owner-week pair

  Scenario: Menu stores recipe assignments
    Given a menu in "building" status
    When an assignment is added with title, thumbnailUrl, source, day, and mealSlot
    Then the assignment is stored as an embedded subdocument
    And mealSlot defaults to "dinner" if not specified

  Scenario: Menu stores family votes
    Given a menu in "survey-sent" status
    When a vote is recorded with voterName, voterToken, and picks array
    Then the vote is stored as an embedded subdocument with votedAt timestamp

  Scenario: Menu tracks voting lifecycle
    Given a menu with status "survey-sent"
    Then votingToken is a unique sparse-indexed string
    And votingOpenedAt and votingClosesAt are both set
```

### Story 2: System pre-fetches and cleans external recipes

**As a** family member
**I want** a curated pool of external recipes ready to browse
**So that** I can discover new meals without waiting for slow API calls

#### Acceptance Criteria

```gherkin
Feature: Discovery recipe pipeline

  Scenario: TheMealDB recipe is fetched and cleaned
    Given a raw recipe from TheMealDB API
    When the cleaning pipeline processes it
    Then ingredient names are separated from prep instructions
    And measures are parsed into structured {quantity, unit} objects
    And known spelling errors are corrected
    And a quality score between 0-100 is assigned

  Scenario: Ingredient prep is separated from name
    Given an ingredient string "chopped tomatoes"
    When the cleaner processes it
    Then name is "tomatoes" and prep info is preserved separately

  Scenario: Measures are parsed correctly
    Given various measure formats ("1/2 cup", "2.5 tsp", "1lb", "3", "pinch")
    When the measure parser processes each
    Then fractions become decimals, jammed units are split, bare numbers kept
    And each produces a valid {quantity, unit} or fallback

  Scenario: Spelling corrections are applied
    Given an ingredient with a known misspelling like "Challots"
    When the cleaner processes it
    Then the corrected spelling "Shallots" is used

  Scenario: Low-quality recipes are scored below threshold
    Given a TheMealDB recipe with only 2 ingredients and no instructions
    When the quality scorer evaluates it
    Then the score is below 60
    And the recipe is stored but won't appear in discovery browsing
```

### Story 3: System generates tags when TheMealDB provides none

**As a** family member browsing discovery recipes
**I want** every recipe to have useful tags
**So that** I can filter and find recipes by cuisine, category, or key ingredients

#### Acceptance Criteria

```gherkin
Feature: Auto-tag generation

  Scenario: Recipe with existing tags keeps them
    Given a TheMealDB recipe with strTags "Spicy,Meat"
    When the tagger processes it
    Then the existing tags are preserved as ["Spicy", "Meat"]

  Scenario: Recipe without tags gets auto-generated ones
    Given a TheMealDB recipe with strTags null
    And category "Chicken" and area "Thai"
    When the tagger processes it
    Then tags include at least "chicken" and "thai"

  Scenario: Ingredient-based tags are added
    Given a recipe with ingredients including "tofu" and "rice noodles"
    And strTags is null
    When the tagger processes it
    Then tags include ingredient-derived terms like "tofu"

  Scenario: Tags are deduplicated and lowercased
    Given a recipe where category is "Beef" and an ingredient is "beef"
    When the tagger generates tags
    Then "beef" appears only once in the tags array
```

### Story 4: User's discovery browsing state is tracked

**As a** family member
**I want** the system to remember which discovery recipes I've seen, saved, or dismissed
**So that** I don't keep seeing the same suggestions

#### Acceptance Criteria

```gherkin
Feature: User discovery state tracking

  Scenario: User sees a discovery recipe
    Given user "user123" has not interacted with recipe "ext-456"
    When the system records action "seen" for that pair
    Then a UserDiscoveryState document is created

  Scenario: User saves a discovery recipe
    Given user "user123" previously saw recipe "ext-456"
    When the system records action "saved"
    Then the existing document is updated to action "saved"

  Scenario: One state per user-recipe pair
    Given user "user123" has a state for recipe "ext-456"
    When a duplicate insert is attempted
    Then the unique index on {userId, externalId} prevents it
```

### Story 5: CLI script fetches and loads the full recipe pool

**As a** system administrator
**I want** a CLI script that fetches all TheMealDB recipes, cleans them, and stores them
**So that** the discovery pool is populated before the feature launches

#### Acceptance Criteria

```gherkin
Feature: CLI fetch script

  Scenario: Full fetch from TheMealDB
    Given the script is run with no arguments
    When it completes
    Then it has fetched recipes for letters A through Z
    And each recipe is cleaned, scored, and upserted into DiscoveryRecipe
    And a summary is printed with counts of added, updated, and total

  Scenario: Script handles TheMealDB downtime gracefully
    Given TheMealDB returns a network error for letter "Q"
    When the script processes all letters
    Then it logs a warning for "Q" and continues with remaining letters
    And the final summary reflects the partial fetch

  Scenario: Script is idempotent
    Given the script was run yesterday and stored 280 recipes
    When the script runs again today
    Then existing recipes are updated (not duplicated) via upsert on externalId
    And new recipes from TheMealDB are added
```

---

## Out of Scope

- API routes for menu CRUD, voting, or discovery (PR-052)
- Frontend UI components for meal planning (PR-053)
- Shopping list integration and finalization flow (split across PR-052 finalize endpoint and PR-054 UI)
- Spoonacular or other external recipe sources (future work, schema supports it)
- Recipe photo fetching or caching (use TheMealDB URLs directly)

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| All 3 models pass typecheck | Zero errors | `npm run typecheck` |
| CLI script completes full fetch | 250+ recipes stored | Script summary output |
| Quality scores distributed 0-100 | No scores outside range | DB query on qualityScore field |
| All indexes defined and correct | Match design spec | Mongoose schema inspection |
| Lint passes | Zero errors | `npm run lint` |

---

## Open Questions

- [x] Quality threshold for discovery display? **60** (recipes below 60 are stored but hidden from browsing)
- [x] Should the CLI script run on a schedule? **No** for now. Manual runs + a refresh API endpoint in PR-052.
- [x] TheMealDB rate limiting? **None documented, but add 100ms delay between letter fetches as courtesy**

---

## References

- [TheMealDB API docs](https://www.themealdb.com/api.php)
- PR-052: API layer that exposes these models via REST endpoints
- PR-053: Frontend UI for meal planning
- PR-054: Shopping list integration and finalization UI
- Existing shopping list aggregator: `src/lib/shopping/aggregator.ts`
- Existing Cooklang serializer: `src/lib/cooklang/`
