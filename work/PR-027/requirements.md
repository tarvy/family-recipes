# PR-027: Cooklang Metadata Handling Consolidation - Requirements

> **Status**: Draft
> **PR Branch**: `feat/027-metadata-consolidation`
> **Dependencies**: PR-026 (Metadata Compatibility)

---

## Problem Statement

The codebase has duplicate metadata extraction logic spread across multiple files:

1. **`parser.ts`** - Manually reads `cooklang.metadata` and applies fields to IRecipe
2. **`metadata.ts`** - Has its own `extractMetadataFromContent()` using regex parsing
3. **`metadata.ts`** - Has `splitMetadataAndBody()` that re-parses content

This duplication:
- Increases maintenance burden (changes must be made in multiple places)
- Creates risk of inconsistency (different parsing behavior between files)
- Ignores library capabilities (the `@cooklang/cooklang-ts` library already parses metadata)

---

## User Stories

### Story 1: Developer Maintains Metadata Logic

**As a** developer maintaining the Cooklang integration
**I want** metadata parsing to be centralized in one place
**So that** I can make changes confidently without missing code paths

#### Acceptance Criteria

```gherkin
Feature: Centralized Metadata Handling

  Scenario: Single source of truth for metadata extraction
    Given the codebase has Cooklang parsing logic
    When I need to add a new metadata field
    Then I should only need to modify one file
    And all consumers should automatically get the new field

  Scenario: Library metadata is used directly
    Given a Cooklang file is parsed with the library
    When accessing metadata
    Then the library's parsed metadata object should be used
    And no re-parsing with regex should occur
```

### Story 2: Recipe Round-Trip Preserves All Metadata

**As a** recipe editor
**I want** all metadata to be preserved when I edit and save
**So that** I don't lose information like source URLs or author names

#### Acceptance Criteria

```gherkin
Feature: Metadata Round-Trip Preservation

  Scenario: Unknown metadata keys are preserved
    Given a recipe with metadata ">> custom-field: my value"
    When I edit the recipe body and save
    Then the custom-field metadata should still be present

  Scenario: All standard metadata survives round-trip
    Given a recipe with title, servings, prep time, author, source
    When I edit and save without changing metadata
    Then all metadata values should be identical to original
```

---

## Out of Scope

- **New metadata fields** - Handled by PR-026
- **UI changes** - This is a refactoring PR
- **API changes** - Internal refactoring only
- **Serialization changes** - Focus on parsing consolidation

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Code duplication reduction | Eliminate redundant regex parsing | Code review |
| Behavior consistency | Zero parsing differences | Unit tests pass |
| Maintainability | Single file for metadata logic | File count |
| Library utilization | Use library's metadata object | Code inspection |

---

## Open Questions

- [ ] Should `splitMetadataAndBody()` be removed or kept as a thin wrapper?
- [ ] How much of `extractMetadataFromContent()` can be replaced with library parsing?
- [ ] Should we create a dedicated `metadata-service.ts` or enhance existing files?

---

## References

- [@cooklang/cooklang-ts documentation](https://github.com/cooklang/cooklang-ts)
- `src/lib/cooklang/parser.ts` - Current parsing implementation
- `src/lib/cooklang/metadata.ts` - Current metadata utilities
- PR-026 requirements (dependency)
