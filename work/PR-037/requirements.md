# PR-037: Recipe Editor & Detail UX Improvements - Requirements

> **Status**: Approved
> **PR Branch**: `feat/037-recipe-ux-improvements`
> **Dependencies**: PR-036 (Cooking Session)

---

## Problem Statement

Four targeted UX issues reduce the polish of the recipe detail page and editor:
1. Users cannot see when a recipe was last updated
2. The cooking panel overlaps the editor save button when active
3. The editor textarea does not grow with content, requiring manual resizing
4. The editor left column does not match the preview column height on desktop

---

## User Stories

### Story 1: User Sees Last Updated Date

**As a** recipe viewer
**I want** to see when a recipe was last updated
**So that** I know how current the recipe information is

#### Acceptance Criteria

```gherkin
Feature: Last Updated Date on Recipe Detail

  Scenario: Database recipe with updatedAt
    Given a recipe loaded from MongoDB with an updatedAt timestamp
    When I view the recipe detail page
    Then I see "Updated Jan 5, 2026" in the meta info row
    And I see "Last updated: Jan 5, 2026" in the footer

  Scenario: File-based recipe without updatedAt
    Given a recipe loaded from the filesystem (no updatedAt)
    When I view the recipe detail page
    Then no updated date is shown in the meta row
    And no updated date is shown in the footer
```

### Story 2: Editor Save Button Visible Above Cooking Panel

**As a** recipe editor
**I want** the save button to remain visible when the cooking panel is active
**So that** I can save my changes without dismissing the cooking panel

#### Acceptance Criteria

```gherkin
Feature: Editor Save Button Z-Index Fix

  Scenario: Cooking panel active during editing
    Given I am editing a recipe
    And the cooking panel is visible with active timers
    When I scroll to the bottom of the editor
    Then the save button bar appears above the cooking panel

  Scenario: No cooking panel
    Given I am editing a recipe
    And no cooking session is active
    When I scroll to the bottom
    Then the save button bar appears normally with no extra padding
```

### Story 3: Auto-growing Editor Textarea

**As a** recipe editor
**I want** the textarea to grow as I type
**So that** I can see all my content without manual resizing

#### Acceptance Criteria

```gherkin
Feature: Auto-grow Textarea

  Scenario: Content exceeds initial height
    Given I am editing a recipe
    When I type or paste content that exceeds the minimum height
    Then the textarea grows to fit the content

  Scenario: Content is removed
    Given the textarea has grown to fit long content
    When I delete content
    Then the textarea shrinks but never below the minimum height (288px)

  Scenario: Manual resize
    Given the textarea has auto-grown
    When I drag the resize handle
    Then I can manually resize the textarea
```

### Story 4: Editor Column Height Matching

**As a** recipe editor on desktop
**I want** the editor column to match the preview column height
**So that** the two-column layout looks balanced

#### Acceptance Criteria

```gherkin
Feature: Column Height Matching

  Scenario: Desktop two-column layout
    Given I am on a desktop screen (lg breakpoint)
    When the preview column is taller than the editor
    Then the editor column stretches to match the preview height

  Scenario: Mobile single-column layout
    Given I am on a mobile screen (below lg breakpoint)
    When I view the editor
    Then the layout is single-column and unaffected
```

---

## Out of Scope

- Adding updatedAt to file-based recipes (filesystem has no update tracking)
- Changing the cooking panel z-index itself
- Adding createdAt display

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| updatedAt displays for DB recipes | 100% of DB recipes with updatedAt | Visual inspection |
| Save button visible above panel | Always visible | Visual inspection |
| Textarea auto-grows | Grows with content | Visual inspection |
| Column heights match on desktop | Visually equal | Visual inspection |

---

## Open Questions

None - all design decisions resolved during planning.

---

## References

- Implementation guide: `.claude/plans/proud-cuddling-valiant-agent-abc3b4c.md`
- Cooking session PR: PR-036
