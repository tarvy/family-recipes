# PR-043: Raw Cooklang Backfill

## Problem

Recipes synced from `.cook` files via `sync.ts` have all parsed fields (title, ingredients, steps, etc.) but **missing `rawCooklang`** — the original Cooklang source text. This means the edit page shows an empty editor for these recipes.

## User Stories

**As a** recipe editor
**I want** synced recipes to have their raw Cooklang content stored
**So that** I can edit them in the Cooklang editor

## Acceptance Criteria

### Scenario: Backfill existing recipes
```gherkin
Given recipes exist in MongoDB without rawCooklang
When the backfill API endpoint is called
Then each recipe's rawCooklang is populated from the .cook file on disk
And if the .cook file is missing, rawCooklang is reconstructed from parsed data
And the response shows a count of backfilled, failed, and skipped recipes
```

### Scenario: Future syncs include rawCooklang
```gherkin
Given a .cook file is synced via sync.ts
When processFile() creates the recipe object
Then rawCooklang contains the original source text
```

### Scenario: backfillRawCooklang() matches all empty states
```gherkin
Given a recipe has rawCooklang that is missing, null, or empty string
When backfillRawCooklang() is called for that recipe
Then the recipe is updated with the provided content
```
