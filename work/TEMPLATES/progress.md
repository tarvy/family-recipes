# PR-XXX: [Feature Name] - Progress & Agent Handoff

> **Status**: Not Started | In Progress | Testing | Complete
> **Started**: YYYY-MM-DD
> **Target**: YYYY-MM-DD
> **Branch**: `feat/xxx-feature-name`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [ ] Draft [ ] Review [ ] Approved | |
| Design | [ ] Draft [ ] Review [ ] Approved | |
| Implementation | [ ] Not Started [ ] In Progress [ ] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

From `.progress.json` PR definition:

- [ ] `path/to/file1.ts` - [brief description]
- [ ] `path/to/file2.ts` - [brief description]
- [ ] `path/to/file3.ts` - [brief description]
- [ ] `docs/FEATURE.md` - [documentation]

---

## Implementation Phases

### Phase 1: [Name]

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] File 1
- [ ] File 2

**Agent Prompt**:
```
[Detailed prompt for AI agent to complete this phase]

Context:
- Read: docs/ARCHITECTURE.md, docs/ENVIRONMENT.md
- Reference: work/PR-XXX/requirements.md, work/PR-XXX/design.md

Task:
1. [Specific step 1]
2. [Specific step 2]
3. [Specific step 3]

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] [Specific test or check]

Output:
- Files created: [list]
- Files modified: [list]
```

---

### Phase 2: [Name]

**Dependencies**: Phase 1

**Deliverables**:
- [ ] File 3
- [ ] File 4

**Agent Prompt**:
```
[Detailed prompt for Phase 2]
```

---

### Phase 3: [Name]

**Dependencies**: Phase 2

**Deliverables**:
- [ ] File 5

**Agent Prompt**:
```
[Detailed prompt for Phase 3]
```

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 1 ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 ░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░
─────────────────────────────────────────────────────────────

Parallel Opportunities:
─────────────────────────────────────────────────────────────
Stream A: Phase 1 → Phase 2a ███████████████████░░░░░░░░░░░░
Stream B: Phase 1 → Phase 2b ░░░░░░░░░░░███████████████░░░░░
Merge:    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░Phase 3 ████
─────────────────────────────────────────────────────────────
```

### Stream A: [Name]
Can run in parallel with Stream B after Phase 1 completes.

**Agent Prompt**:
```
[Prompt for Stream A work]
```

### Stream B: [Name]
Can run in parallel with Stream A after Phase 1 completes.

**Agent Prompt**:
```
[Prompt for Stream B work]
```

---

## Test Plan

### Unit Tests

| Test | File | Status | Notes |
|------|------|--------|-------|
| [Test name] | `tests/unit/file.test.ts` | [ ] Pass [ ] Fail | |

**Run**: `npm run test:unit -- --filter="feature"`

### Integration Tests

| Test | File | Status | Notes |
|------|------|--------|-------|
| [Test name] | `tests/integration/file.test.ts` | [ ] Pass [ ] Fail | |

**Run**: `npm run test:integration -- --filter="feature"`

### E2E Tests

| Scenario | File | Status | Notes |
|----------|------|--------|-------|
| [Scenario] | `e2e/feature.spec.ts` | [ ] Pass [ ] Fail | |

**Run**: `npm run test:e2e -- --grep="feature"`

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| [Manual check 1] | [Expected behavior] | | [ ] Pass [ ] Fail |
| [Manual check 2] | [Expected behavior] | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run test` - All tests pass
- [ ] `python scripts/progress.py` - PR shows complete

### Quality Checks
- [ ] Thai-lint passes (run in CI or locally via Docker)
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] Documentation updated

### Integration Checks
- [ ] Feature works in dev environment
- [ ] No regression in existing features
- [ ] Mobile responsive (tested at 375px)

---

## Session Log

### Session 1 - YYYY-MM-DD

**Agent**: [Claude Code / Cursor / Human]
**Duration**: [X minutes]

**Completed**:
- [x] Task 1
- [x] Task 2

**Issues Encountered**:
- [Issue and resolution]

**Next Steps**:
- [ ] Task 3
- [ ] Task 4

---

### Session 2 - YYYY-MM-DD

**Agent**: [Agent name]
**Duration**: [X minutes]

**Completed**:
- [x] Task 3

**Issues Encountered**:
- None

**Next Steps**:
- [ ] Task 4

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-XXX/` directory (or archive if needed for reference)
- [ ] Update permanent docs (`docs/*.md`) with any new information
- [ ] Remove any debug code or test data
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
