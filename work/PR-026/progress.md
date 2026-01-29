# PR-026: Cooklang Metadata Compatibility - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: -
> **Target**: -
> **Branch**: `feat/026-cooklang-metadata-compatibility`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Initial draft complete |
| Design | [x] Draft [ ] Review [ ] Approved | Initial draft complete |
| Implementation | [x] Not Started [ ] In Progress [ ] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

- [ ] `src/lib/cooklang/constants.ts` - Add METADATA_ALIASES map and normalizeMetadataKey()
- [ ] `src/lib/cooklang/parser.ts` - Update to use aliases, add parseTimeString()
- [ ] `src/lib/cooklang/metadata.ts` - Update extractMetadataFromContent() to use aliases
- [ ] `src/db/types/index.ts` - Add author, diet, locale to IRecipe interface
- [ ] `tests/unit/cooklang-metadata.test.ts` - Unit tests for new parsing logic
- [ ] `docs/COOKLANG.md` - Document supported metadata keys and aliases

---

## Implementation Phases

### Phase 1: Constants and Utilities

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/lib/cooklang/constants.ts` - METADATA_ALIASES, normalizeMetadataKey()
- [ ] `src/lib/cooklang/constants.ts` - parseTimeString() with compact format support

**Agent Prompt**:
```
Context:
- Read: docs/COOKLANG.md, src/lib/cooklang/constants.ts
- Reference: work/PR-026/requirements.md, work/PR-026/design.md

Task:
1. Add METADATA_ALIASES map to constants.ts:
   - 'serves' → 'servings'
   - 'yield' → 'servings'
   - 'time' → 'total time'
   - 'duration' → 'total time'
   - 'time required' → 'total time'
   - 'introduction' → 'description'

2. Add normalizeMetadataKey(key: string): string function

3. Add parseTimeString(timeStr: string): number | undefined function
   - Support compact: "1h30m", "45m", "2h"
   - Support verbose: "30 minutes", "1 hour"
   - Return minutes as number

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Manual test: parseTimeString('1h30m') returns 90

Output:
- Files modified: src/lib/cooklang/constants.ts
```

---

### Phase 2: Parser Integration

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/lib/cooklang/parser.ts` - Use normalizeMetadataKey() and parseTimeString()
- [ ] `src/lib/cooklang/metadata.ts` - Update extractMetadataFromContent()

**Agent Prompt**:
```
Context:
- Read: src/lib/cooklang/parser.ts, src/lib/cooklang/metadata.ts
- Reference: work/PR-026/design.md (Implementation Details section)
- Phase 1 must be complete

Task:
1. In parser.ts applyTimeFields():
   - Replace existing time parsing with parseTimeString()

2. In parser.ts applyOptionalMetadata():
   - Use normalizeMetadataKey() to resolve aliases before switch statement

3. In metadata.ts extractMetadataFromContent():
   - Import and use normalizeMetadataKey()
   - Handle new keys: author, diet, locale

4. Update switch statements to handle normalized keys

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Parse recipe with ">> serves: 4" produces servings: 4
- [ ] Parse recipe with ">> time: 1h30m" produces totalTime: 90

Output:
- Files modified: src/lib/cooklang/parser.ts, src/lib/cooklang/metadata.ts
```

---

### Phase 3: Type Definitions

**Dependencies**: Phase 2

**Deliverables**:
- [ ] `src/db/types/index.ts` - Add new optional fields to IRecipe

**Agent Prompt**:
```
Context:
- Read: src/db/types/index.ts
- Reference: work/PR-026/design.md (Database Changes section)

Task:
1. Add optional fields to IRecipe interface:
   - author?: string
   - diet?: string[]
   - locale?: string

2. Ensure Mongoose model allows these fields (should work automatically)

Verification:
- [ ] `npm run typecheck` passes
- [ ] No breaking changes to existing code

Output:
- Files modified: src/db/types/index.ts
```

---

### Phase 4: Unit Tests

**Dependencies**: Phase 3

**Deliverables**:
- [ ] `tests/unit/cooklang-metadata.test.ts` or similar

**Agent Prompt**:
```
Context:
- Read: existing test files in tests/ directory for patterns
- Reference: work/PR-026/design.md (Testing Strategy section)

Task:
1. Create or update unit tests for:
   - normalizeMetadataKey() - all alias mappings
   - parseTimeString() - compact and verbose formats
   - parseServings() - various input formats
   - Full recipe parsing with aliases

2. Test cases from design.md:
   - parseTimeString('30 minutes') → 30
   - parseTimeString('1h30m') → 90
   - parseTimeString('45m') → 45
   - parseServings('4') → 4
   - parseServings('12 cookies') → 12
   - normalizeMetadataKey('serves') → 'servings'

Verification:
- [ ] `npm run test` passes
- [ ] All new test cases pass

Output:
- Files created/modified: tests/unit/cooklang-metadata.test.ts
```

---

### Phase 5: Documentation

**Dependencies**: Phase 4

**Deliverables**:
- [ ] `docs/COOKLANG.md` - Updated with supported metadata keys

**Agent Prompt**:
```
Context:
- Read: docs/COOKLANG.md
- Reference: work/PR-026/requirements.md (References section)

Task:
1. Add section on supported metadata keys with table:
   | Key | Aliases | Type | Example |
   | servings | serves, yield | number | "4", "12 cookies" |
   | prep time | - | time | "30 minutes", "1h30m" |
   | etc.

2. Document time format options:
   - Verbose: "30 minutes", "1 hour"
   - Compact: "30m", "1h", "1h30m"

3. Document new fields: author, diet, locale

Verification:
- [ ] Documentation is accurate and complete
- [ ] Examples are correct

Output:
- Files modified: docs/COOKLANG.md
```

---

## Test Plan

### Unit Tests

| Test | File | Status | Notes |
|------|------|--------|-------|
| normalizeMetadataKey mappings | `tests/unit/cooklang-metadata.test.ts` | [ ] Pass [ ] Fail | |
| parseTimeString compact format | `tests/unit/cooklang-metadata.test.ts` | [ ] Pass [ ] Fail | |
| parseTimeString verbose format | `tests/unit/cooklang-metadata.test.ts` | [ ] Pass [ ] Fail | |
| parseServings extraction | `tests/unit/cooklang-metadata.test.ts` | [ ] Pass [ ] Fail | |
| Full recipe with aliases | `tests/unit/cooklang-metadata.test.ts` | [ ] Pass [ ] Fail | |

**Run**: `npm run test -- --filter="metadata"`

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Parse `>> serves: 4` | servings = 4 | | [ ] Pass [ ] Fail |
| Parse `>> time: 1h30m` | totalTime = 90 | | [ ] Pass [ ] Fail |
| Parse `>> author: Grandma` | author = "Grandma" | | [ ] Pass [ ] Fail |
| Parse existing recipes | No regressions | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run test` - All tests pass

### Quality Checks
- [ ] Thai-lint passes
- [ ] No TODO comments left in code
- [ ] No console.log statements
- [ ] Documentation updated

### Integration Checks
- [ ] Existing recipes still parse correctly
- [ ] New alias formats work in dev environment
- [ ] Round-trip (parse → edit → save) preserves data

---

## Session Log

*No sessions yet*

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-026/` directory
- [ ] Update permanent docs (`docs/COOKLANG.md`) with new information
- [ ] Verify `.progress.json` shows PR complete (if added)
- [ ] Final `npm run lint && npm run typecheck` passes
