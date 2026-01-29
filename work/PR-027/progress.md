# PR-027: Cooklang Metadata Handling Consolidation - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: -
> **Target**: -
> **Branch**: `feat/027-metadata-consolidation`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Initial draft complete |
| Design | [x] Draft [ ] Review [ ] Approved | Initial draft complete |
| Implementation | [x] Not Started [ ] In Progress [ ] Complete | Depends on PR-026 |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

- [ ] `src/lib/cooklang/metadata-transform.ts` - New shared transformation layer
- [ ] `src/lib/cooklang/parser.ts` - Refactored to use metadata-transform
- [ ] `src/lib/cooklang/metadata.ts` - Simplified to use library + transform
- [ ] `tests/unit/metadata-transform.test.ts` - Unit tests for new module
- [ ] Regression tests confirming identical behavior

---

## Implementation Phases

### Phase 1: Create Transformation Layer

**Dependencies**: PR-026 complete

**Deliverables**:
- [ ] `src/lib/cooklang/metadata-transform.ts`

**Agent Prompt**:
```
Context:
- Read: src/lib/cooklang/parser.ts (applyOptionalMetadata, applyTimeFields, applyStringFields)
- Read: src/lib/cooklang/metadata.ts (extractMetadataFromContent)
- Read: src/lib/cooklang/constants.ts (normalizeMetadataKey, parseTimeString from PR-026)
- Reference: work/PR-027/design.md

Task:
1. Create new file src/lib/cooklang/metadata-transform.ts

2. Implement transformRawMetadata(raw: Record<string, string>): CooklangMetadata
   - Iterate over raw metadata entries
   - Normalize each key using normalizeMetadataKey()
   - Apply value parsing (parseTimeString for time fields, parseServings for servings)
   - Return structured CooklangMetadata object

3. Extract helper functions from parser.ts:
   - Move relevant logic to metadata-transform.ts
   - Keep single source of truth

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] transformRawMetadata({ 'title': 'Test', 'serves': '4' }) returns correct structure

Output:
- Files created: src/lib/cooklang/metadata-transform.ts
```

---

### Phase 2: Refactor parser.ts

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/lib/cooklang/parser.ts` - Uses metadata-transform

**Agent Prompt**:
```
Context:
- Read: src/lib/cooklang/parser.ts
- Read: src/lib/cooklang/metadata-transform.ts (from Phase 1)
- Reference: work/PR-027/design.md (Step 2)

Task:
1. Import transformRawMetadata from metadata-transform.ts

2. In parseCooklang():
   - Replace manual metadata field extraction with:
     const structuredMetadata = transformRawMetadata(cooklang.metadata);

3. Remove or simplify:
   - applyOptionalMetadata() - replaced by transformRawMetadata
   - applyTimeFields() - moved to metadata-transform
   - applyStringFields() - moved to metadata-transform

4. Keep slug generation and step conversion logic in parser.ts

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Existing recipe parsing still works identically
- [ ] Run: node -e "const {parseCooklang} = require('./src/lib/cooklang/parser'); ..."

Output:
- Files modified: src/lib/cooklang/parser.ts
```

---

### Phase 3: Simplify metadata.ts

**Dependencies**: Phase 2

**Deliverables**:
- [ ] `src/lib/cooklang/metadata.ts` - Uses library + transform

**Agent Prompt**:
```
Context:
- Read: src/lib/cooklang/metadata.ts
- Read: src/lib/cooklang/metadata-transform.ts
- Reference: work/PR-027/design.md (Step 3, Step 4)

Task:
1. Update extractMetadataFromContent():
   - Import Recipe from @cooklang/cooklang-ts
   - Use library parsing instead of regex:
     const recipe = new Recipe(content);
     return transformRawMetadata(recipe.metadata);

2. Evaluate splitMetadataAndBody():
   - If used by editor: keep but simplify using library
   - If not needed: remove entirely
   - Document decision in code comments

3. Remove redundant regex parsing code
   - METADATA_LINE_REGEX may still be needed for body extraction
   - Keep only what's necessary

4. Preserve public API:
   - extractMetadataFromContent() signature unchanged
   - splitMetadataAndBody() signature unchanged (if kept)
   - buildCooklangContent() unchanged (serialization)

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] extractMetadataFromContent produces same output as before
- [ ] Editor still works (if splitMetadataAndBody is used)

Output:
- Files modified: src/lib/cooklang/metadata.ts
```

---

### Phase 4: Regression Testing

**Dependencies**: Phase 3

**Deliverables**:
- [ ] Regression tests comparing old vs new behavior
- [ ] Unit tests for metadata-transform.ts

**Agent Prompt**:
```
Context:
- Read: tests/ directory structure for patterns
- Read: recipes/ directory for test data
- Reference: work/PR-027/design.md (Testing Strategy)

Task:
1. Create tests/unit/metadata-transform.test.ts:
   - Test transformRawMetadata with various inputs
   - Test edge cases (empty, missing fields, aliases)

2. Create regression test:
   - Load several real recipes from recipes/ directory
   - Parse with both old and new implementations
   - Assert identical metadata output

3. Update any existing tests that may be affected

Verification:
- [ ] `npm run test` passes
- [ ] No regressions detected
- [ ] Coverage for new code

Output:
- Files created: tests/unit/metadata-transform.test.ts
- Files modified: existing test files if needed
```

---

### Phase 5: Cleanup and Documentation

**Dependencies**: Phase 4

**Deliverables**:
- [ ] Remove dead code
- [ ] Update any relevant documentation

**Agent Prompt**:
```
Context:
- Review all changes from Phases 1-4
- Read: docs/COOKLANG.md

Task:
1. Remove any dead code:
   - Unused functions in parser.ts
   - Unused regex patterns in metadata.ts
   - Unused imports

2. Add/update code comments explaining:
   - Why library is used for parsing
   - Where transformation happens
   - Public API boundaries

3. Update docs/COOKLANG.md if architecture section exists

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] No unused exports
- [ ] Code is well-documented

Output:
- Files modified: various cleanup
```

---

## Test Plan

### Unit Tests

| Test | File | Status | Notes |
|------|------|--------|-------|
| transformRawMetadata basic | `tests/unit/metadata-transform.test.ts` | [ ] Pass | |
| transformRawMetadata with aliases | `tests/unit/metadata-transform.test.ts` | [ ] Pass | |
| extractMetadataFromContent | `tests/unit/metadata.test.ts` | [ ] Pass | |
| Regression vs old implementation | `tests/unit/metadata-regression.test.ts` | [ ] Pass | |

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Parse existing recipe | Same metadata as before | | [ ] Pass [ ] Fail |
| Edit and save recipe | Metadata preserved | | [ ] Pass [ ] Fail |
| Import external recipe | All metadata captured | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run test` - All tests pass

### Quality Checks
- [ ] No TODO comments left
- [ ] No console.log statements
- [ ] Code comments explain architecture

### Regression Checks
- [ ] All existing recipes parse identically
- [ ] Editor round-trip works
- [ ] No breaking API changes

---

## Session Log

*No sessions yet*

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-027/` directory
- [ ] Verify no dead code remains
- [ ] Final `npm run lint && npm run typecheck` passes
