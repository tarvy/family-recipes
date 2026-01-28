# PR-020: Observability - Vercel Logs First (No Grafana OTEL) - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-01-28
> **Target**: 2026-02-04
> **Branch**: `feat/pr-020-observability-logs`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Drafted based on current repo state |
| Design | [x] Draft [ ] Review [ ] Approved | Drafted; needs review |
| Implementation | [ ] Not Started [ ] In Progress [ ] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

Aligned to `.progress.json` PR definition (outstanding items only):

- [ ] `src/instrumentation.ts` - Minimal no-op instrumentation module (no OTEL imports)
- [ ] `src/lib/telemetry.ts` - Confirm no-op behavior + comments
- [ ] `src/lib/logger.ts` - Optional request context enrichment (only if approved)
- [ ] `docs/OBSERVABILITY.md` - Align with Vercel-first logging

Optional (requires explicit approval in Open Questions):
- [ ] `.env.example` - Remove or deprecate Grafana runtime vars
- [ ] `docs/ENVIRONMENT.md` - Update runtime env var guidance

---

## Implementation Phases

### Phase 1: Documentation Alignment

**Dependencies**: Requirements + Design approved

**Deliverables**:
- [ ] `docs/OBSERVABILITY.md`
- [ ] `docs/ENVIRONMENT.md`
- [ ] `.env.example`

**Agent Prompt**:
```
Context:
- Read: docs/ARCHITECTURE.md, docs/OBSERVABILITY.md, docs/ENVIRONMENT.md
- Reference: work/PR-020/requirements.md, work/PR-020/design.md

Task:
1. Update observability docs to describe Vercel-first logging and disabled tracing.
2. If approved, remove or explicitly mark Grafana runtime vars as deprecated.
3. Ensure docs are consistent with current runtime behavior.

Verification:
- [ ] Docs mention Vercel logs as the primary debugging surface.
- [ ] No claims that Grafana OTEL is active in runtime.

Output:
- Files modified: docs/OBSERVABILITY.md, docs/ENVIRONMENT.md, .env.example
```

---

### Phase 2: Runtime Adjustments (No-Op Instrumentation)

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/instrumentation.ts`
- [ ] `src/lib/telemetry.ts`

**Agent Prompt**:
```
Context:
- Read: docs/OBSERVABILITY.md, src/lib/telemetry.ts
- Reference: work/PR-020/design.md

Task:
1. Add a minimal `src/instrumentation.ts` that does not import OTEL packages.
2. Keep telemetry helpers as safe no-ops with clear comments.
3. Ensure no ESM/CJS incompatibility is introduced.

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

Output:
- Files created: src/instrumentation.ts
- Files modified: src/lib/telemetry.ts (if needed)
```

---

### Phase 3: Log Context Enrichment (Optional)

**Dependencies**: Phase 2

**Deliverables**:
- [ ] `src/lib/logger.ts`
- [ ] API route usage updates (only if needed)

**Agent Prompt**:
```
Context:
- Read: src/lib/logger.ts
- Reference: work/PR-020/design.md

Task:
1. Add optional request context enrichment (request id, path, method).
2. Prefer non-invasive changes; avoid per-route boilerplate if possible.
3. Ensure logged data avoids PII/secrets.

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

Output:
- Files modified: src/lib/logger.ts (and any minimal call sites)
```

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Auth magic link request logs | Log appears with request id/path | | [ ] Pass [ ] Fail |
| Runtime does not crash on telemetry calls | No errors | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `python scripts/progress.py` - PR shows complete

### Quality Checks
- [ ] Thai-lint passes
- [ ] No console.log statements
- [ ] Documentation updated

---

## Session Log

### Session 1 - 2026-01-28

**Agent**: Codex
**Duration**: 20 minutes

**Completed**:
- [x] Reviewed `docs/ARCHITECTURE.md` and `docs/OBSERVABILITY.md`
- [x] Checked progress tracker and current PR status
- [x] Drafted PR-020 planning docs
