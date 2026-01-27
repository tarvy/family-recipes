# PR-008: Auth - Passkeys - Progress & Agent Handoff

> **Status**: Testing
> **Started**: 2026-01-27
> **Target**: 2026-01-30
> **Branch**: `feat/pr-008-passkeys`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Drafted 2026-01-27 |
| Design | [x] Draft [ ] Review [ ] Approved | Drafted 2026-01-27 |
| Implementation | [ ] Not Started [ ] In Progress [x] Complete | Server + UI complete |
| Testing | [ ] Unit [ ] Integration [ ] E2E | Manual verification pending |
| Documentation | [x] Updated [ ] Reviewed | Updated auth + environment docs |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | Remove work/PR-008 after merge |

---

## Deliverables Checklist

From `.progress.json` PR definition:

- [x] `src/lib/auth/passkey.ts` - Passkey registration/auth helpers
- [x] `src/app/api/auth/passkey/register/route.ts` - Registration API
- [x] `src/app/api/auth/passkey/authenticate/route.ts` - Authentication API
- [x] `src/app/(main)/settings/page.tsx` - Settings page for passkeys

Additional deliverables:

- [x] `src/components/auth/passkey-manager.tsx` - Client UI for passkey actions
- [x] `src/app/(auth)/login/page.tsx` - Passkey sign-in option
- [x] `docs/AUTH.md` - Passkey documentation
- [x] `src/db/models/allowed-email.model.ts` - Allowlist model
- [x] `src/lib/auth/allowlist.ts` - Allowlist helpers + owner bootstrap
- [x] `src/app/api/admin/allowlist/route.ts` - Allowlist list/add
- [x] `src/app/api/admin/allowlist/[email]/route.ts` - Allowlist removal
- [x] `src/app/api/invite/route.ts` - Invitation endpoint

---

## Implementation Phases

### Phase 1: Server Passkey Support

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/lib/auth/passkey.ts`
- [ ] `src/app/api/auth/passkey/register/route.ts`
- [ ] `src/app/api/auth/passkey/authenticate/route.ts`

**Agent Prompt**:
```
Context:
- Read: docs/ARCHITECTURE.md, docs/ENVIRONMENT.md, docs/OBSERVABILITY.md
- Reference: work/PR-008/requirements.md, work/PR-008/design.md

Task:
1. Implement passkey helpers with challenge signing and validation.
2. Build register/authenticate API routes with withTrace + traceDbQuery.
3. Ensure session creation and cookie handling mirrors magic link flow.

Verification:
- [ ] TypeScript passes for new files
- [ ] API routes return expected status codes

Output:
- Files created: src/lib/auth/passkey.ts
- Files modified: src/lib/auth/index.ts (export)
```

---

### Phase 2: UI + Settings

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/app/(main)/settings/page.tsx`
- [ ] `src/components/auth/passkey-manager.tsx`
- [ ] `src/app/(auth)/login/page.tsx`

**Agent Prompt**:
```
Task:
1. Add a server-rendered settings page that lists passkeys.
2. Add a client component to register passkeys via WebAuthn.
3. Add passkey sign-in to the login page.

Verification:
- [ ] Passkey registration flow works in dev
- [ ] Passkey login redirects to /
```

---

### Phase 3: Docs + QA

**Dependencies**: Phase 2

**Deliverables**:
- [x] `docs/AUTH.md`
- [ ] Manual verification notes

**Agent Prompt**:
```
Task:
1. Update authentication docs to include passkey flows and endpoints.
2. Capture manual test results in progress.md.

Verification:
- [ ] docs/AUTH.md updated
- [ ] manual checks recorded
```

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Register passkey | Passkey saved and listed | | [ ] Pass [ ] Fail |
| Passkey login | Session created, redirected | | [ ] Pass [ ] Fail |
| Unknown credential | Error response, no session | | [ ] Pass [ ] Fail |
| Non-allowlisted email | No email sent, sign-in blocked | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [x] `npm run lint:fix` - Biome fixes applied
- [x] `npm run lint` - All files pass Biome
- [x] `npm run typecheck` - No TypeScript errors
- [x] `python scripts/progress.py` - PR shows complete

### Quality Checks
- [ ] Thai-lint passes (run locally or in CI)
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [x] Documentation updated

---

## Session Log

### Session 1 - 2026-01-27

**Agent**: Codex
**Duration**: 30 min

**Completed**:
- [x] Drafted requirements.md
- [x] Drafted design.md
- [x] Drafted progress.md

### Session 2 - 2026-01-27

**Agent**: Codex
**Duration**: 90 min

**Completed**:
- [x] Implemented passkey helpers and API routes
- [x] Added settings UI and passkey sign-in on login
- [x] Updated auth/environment docs
- [x] Ran lint, typecheck, and progress script

### Session 3 - 2026-01-27

**Agent**: Codex
**Duration**: 60 min

**Completed**:
- [x] Added allowlist model and auth enforcement
- [x] Implemented admin allowlist + invite endpoints
- [x] Updated requirements/design + docs
- [x] Ran lint and typecheck
