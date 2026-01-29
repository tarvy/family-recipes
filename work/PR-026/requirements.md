# PR-026: Cooklang Metadata Compatibility - Requirements

> **Status**: Draft
> **PR Branch**: `feat/026-cooklang-metadata-compatibility`
> **Dependencies**: None (PR-025 complete)

---

## Problem Statement

The current Cooklang parser only recognizes a limited set of metadata keys, causing compatibility issues when importing recipes from external sources that use the full Cooklang specification. Additionally, time parsing only supports verbose formats like "30 minutes" but not the spec-recommended compact format "30m" or "1h30m".

This limits:
1. **Recipe portability** - Recipes from cooklang.org examples or other tools may lose metadata
2. **Spec compliance** - We don't support all standard metadata keys
3. **User flexibility** - Users familiar with Cooklang conventions can't use their preferred formats

---

## User Stories

### Story 1: Recipe Importer Uses Standard Cooklang Metadata

**As a** family recipe contributor
**I want** to import recipes that use standard Cooklang metadata keys
**So that** metadata like author, dietary info, and time is preserved

#### Acceptance Criteria

```gherkin
Feature: Cooklang Metadata Key Aliases

  Scenario: Parse recipe with "serves" instead of "servings"
    Given a Cooklang file with metadata ">> serves: 4"
    When the recipe is parsed
    Then the recipe servings should be 4

  Scenario: Parse recipe with "yield" instead of "servings"
    Given a Cooklang file with metadata ">> yield: 12 cookies"
    When the recipe is parsed
    Then the recipe servings should be 12

  Scenario: Parse recipe with "time" as total time
    Given a Cooklang file with metadata ">> time: 45 minutes"
    When the recipe is parsed
    Then the recipe totalTime should be 45

  Scenario: Parse recipe with "duration" as total time
    Given a Cooklang file with metadata ">> duration: 1 hour"
    When the recipe is parsed
    Then the recipe totalTime should be 60

  Scenario: Parse recipe with "introduction" as description
    Given a Cooklang file with metadata ">> introduction: A family favorite"
    When the recipe is parsed
    Then the recipe description should be "A family favorite"
```

### Story 2: User Writes Recipe with Compact Time Format

**As a** recipe author
**I want** to use compact time notation like "1h30m"
**So that** I can write recipes more quickly and match Cooklang conventions

#### Acceptance Criteria

```gherkin
Feature: Compact Time Format Parsing

  Scenario: Parse HhMm format
    Given a Cooklang file with metadata ">> prep time: 1h30m"
    When the recipe is parsed
    Then the recipe prepTime should be 90

  Scenario: Parse minutes-only compact format
    Given a Cooklang file with metadata ">> cook time: 45m"
    When the recipe is parsed
    Then the recipe cookTime should be 45

  Scenario: Parse hours-only compact format
    Given a Cooklang file with metadata ">> total time: 2h"
    When the recipe is parsed
    Then the recipe totalTime should be 120

  Scenario: Preserve backwards compatibility
    Given a Cooklang file with metadata ">> prep time: 30 minutes"
    When the recipe is parsed
    Then the recipe prepTime should be 30
```

### Story 3: Recipe Includes Extended Metadata

**As a** recipe curator
**I want** to store author, dietary info, and locale metadata
**So that** I can organize and filter recipes by these attributes

#### Acceptance Criteria

```gherkin
Feature: Extended Metadata Keys

  Scenario: Parse author metadata
    Given a Cooklang file with metadata ">> author: Grandma Rose"
    When the recipe is parsed
    Then the recipe author should be "Grandma Rose"

  Scenario: Parse diet metadata
    Given a Cooklang file with metadata ">> diet: gluten-free, dairy-free"
    When the recipe is parsed
    Then the recipe diet should contain "gluten-free" and "dairy-free"

  Scenario: Parse locale metadata
    Given a Cooklang file with metadata ">> locale: en_US"
    When the recipe is parsed
    Then the recipe locale should be "en_US"
```

---

## Out of Scope

- **Shopping list / aisle configuration** - Deferred to future PR
- **Recipe scaling with fixed quantities (`=` prefix)** - Deferred to future PR
- **Nested metadata format (`source.name`, `time.prep`)** - Consider for future PR
- **UI changes** - This PR focuses on parsing; display changes if needed in separate PR
- **Database schema changes** - New fields stored in existing flexible metadata structure

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Metadata alias coverage | 100% of spec aliases | Unit tests for each alias |
| Time format coverage | Support `Xh`, `Xm`, `XhYm` formats | Unit tests |
| Backwards compatibility | No breaking changes | Existing tests pass |
| Recipe import success | Recipes from cooklang.org parse correctly | Manual test with sample recipes |

---

## Open Questions

- [x] Should `yield: 12 cookies` extract just the number (12) or preserve the unit? → **Extract number only for servings field**
- [ ] Should we add these new fields (author, diet, locale) to the MongoDB schema or keep them in a flexible metadata object?
- [ ] Should the editor UI expose these new fields, or just preserve them on round-trip?

---

## References

- [Cooklang Specification - Metadata](https://cooklang.org/docs/spec/)
- [Cooklang Canonical Metadata Keys](https://cooklang.org/docs/spec/#canonical-metadata)
- [Project Cooklang Documentation](docs/COOKLANG.md)
