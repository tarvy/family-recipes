# PR-048: Passkey Localhost Origin Compatibility - Progress & Agent Handoff

> **Status**: Testing
> **Started**: 2026-03-02
> **Target**: 2026-03-02
> **Branch**: `main`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [x] Review [x] Approved | Captures localhost port mismatch failure |
| Design | [x] Draft [x] Review [x] Approved | Localhost-only dynamic origin fallback |
| Implementation | [ ] Not Started [ ] In Progress [x] Complete | Code changes applied |
| Testing | [ ] Unit [ ] Integration [ ] E2E | Lint/typecheck complete; manual auth check pending |
| Documentation | [x] Updated [ ] Reviewed | AUTH.md note added |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | Pending |

---

## Deliverables Checklist

- [x] `src/lib/auth/passkey.ts` - Expected-origin fallback logic for localhost
- [x] `src/app/api/auth/passkey/authenticate/route.ts` - Pass request origin into verification
- [x] `src/app/api/auth/passkey/register/route.ts` - Pass request origin into verification
- [x] `docs/AUTH.md` - Document localhost fallback behavior

---

## Implementation Phases

### Phase 1: Implement localhost origin fallback

**Dependencies**: None

**Deliverables**:
- [ ] `src/lib/auth/passkey.ts`
- [ ] `src/app/api/auth/passkey/authenticate/route.ts`
- [ ] `src/app/api/auth/passkey/register/route.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-048/requirements.md and work/PR-048/design.md
- Existing failure: expected origin is localhost:3000 while app runs on localhost:3001

Task:
1. Update passkey verification helpers to accept request origin context.
2. Add localhost-only fallback behavior (allow configured origin + request origin when both loopback).
3. Wire request Origin header from passkey routes into verification functions.

Verification:
- npm run lint
- npm run typecheck
```

---

### Phase 2: Documentation + validation

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `docs/AUTH.md`
- [ ] progress checklist updates

**Agent Prompt**:
```
Task:
1. Update AUTH docs for local passkey behavior when port changes.
2. Run lint and typecheck.
3. Log outcome in session log.
```

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Passkey authenticate on `http://localhost:3001` with app URL `http://localhost:3000` | Auth succeeds | Pending user run | [ ] Pass [ ] Fail |
| Passkey register on `http://localhost:3001` with app URL `http://localhost:3000` | Registration succeeds | Pending user run | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [x] Deliverables registered in `scripts/deliverables.yaml`
- [x] `npm run lint`
- [x] `npm run typecheck`

### Quality Checks
- [ ] No console usage added
- [ ] Documentation updated

---

## Session Log

### Session 1 - 2026-03-02

**Agent**: Codex
**Duration**: ~25 minutes

**Completed**:
- [x] Created `work/PR-048/`
- [x] Wrote requirements/design/progress docs

**Issues Encountered**:
- None

**Next Steps**:
- [x] Implement code fix
- [x] Run lint/typecheck
- [x] Manual verification guidance

---

## Cleanup Checklist

- [ ] Remove `work/PR-048/` after PR completion
- [ ] Final `npm run lint && npm run typecheck` passes
