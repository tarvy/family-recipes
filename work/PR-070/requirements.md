# PR-070: Capture a recipe from a photo or voice note

> **Status**: Approved
> **PR Branch**: `cursor/capture-recipe-from-media-4319`

## Problem Statement

The household cook wants a phone Shortcut. They photograph a recipe card or talk through a recipe, and it shows up in family-recipes as a new recipe or a change to an existing one. They never write Cooklang by hand. No REST route accepts a machine credential today, and `updateRecipe` wipes the photo gallery on every edit.

## User Stories

### Story 1: Add a recipe from a card

**As a** family cook with a device key
**I want** to send 1 to 4 photos or audio clips with intent `add`
**So that** a new recipe is saved without typing it

```gherkin
Feature: Capture

  Scenario: A card becomes a recipe
    Given a family user's device key
    When the phone posts a card photo to /api/captures with intent add
    Then a recipe is created with source capture
    And the response says saved with the slug, title, and category

  Scenario: The same submit twice
    Given a capture for these exact bytes, intent, and note
    When the phone posts them again
    Then the response names the same capture
    And no second recipe or second agent run exists

  Scenario: The model drafts invalid Cooklang
    When every draft the model proposes fails checkDraft
    Then createRecipe and updateRecipe are never called
    And the capture says needs_attention

  Scenario: Add never overwrites
    Given a recipe with the drafted title and different content
    When the add capture commits
    Then the capture says needs_attention with reason duplicate
```

### Story 2: Change a recipe by voice

**As a** family cook
**I want** to say what to change with intent `change`
**So that** the recipe updates and keeps its photos, rating, and cook log

```gherkin
Feature: Change capture

  Scenario: A change keeps household fields
    Given a recipe with photos, a rating, and a cook log
    When a change capture commits
    Then the Cooklang is replaced
    And photoUrls, primaryPhotoUrl, rating, cookLog, useCount, lastUsedAt, and createdAt are unchanged

  Scenario: Someone edited the recipe first
    Given the recipe changed after the agent read it
    When the change capture commits
    Then the capture says needs_attention with reason conflict
    And the recipe is not overwritten
```

### Story 3: Recover an interrupted capture

```gherkin
Feature: Recovery

  Scenario: The function died after writing the recipe
    Given a drafted capture whose lease expired
    And the recipe's rawCooklang equals the draft
    When the phone polls or resubmits
    Then the capture says saved without a model call
```

## Out of Scope

- Inngest, QStash, or any queue. Blob storage of capture bytes.
- Changes to `syncRecipes`.
- Mounting the camera UI.
- Browser-session captures. Device keys only.
