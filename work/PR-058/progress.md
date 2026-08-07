# PR-058: Owner-Distributed Magic Links - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-08-07
> **Target**: TBD
> **Branch**: `cursor/manual-magic-links-c785`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft | Owner-distributed, single-use links defined |
| Design | [x] Draft | API, UI, security, and rollout designed |
| Implementation | [ ] Not Started | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

- [ ] `src/lib/auth/magic-link.ts` - Manual token creation without email delivery
- [ ] `src/app/api/admin/magic-link/route.ts` - Owner-only generation endpoint
- [ ] `src/components/auth/manual-magic-link-form.tsx` - Copyable link UI
- [ ] `src/app/(main)/settings/page.tsx` - Owner-only form integration
- [ ] `src/app/(auth)/login/page.tsx` - Resend-free login guidance
- [ ] `src/lib/email/send.ts` - Removed
- [ ] `docs/AUTH.md` - Manual distribution flow documented
- [ ] `docs/ENVIRONMENT.md` - Resend configuration removed
- [ ] `package.json` / `package-lock.json` - Resend dependency removed
- [ ] Automated checks - lint, typecheck, build

---

## Implementation Phases

### Phase 1: Manual Token Service and API

**Dependencies**: None

**Deliverables**:

- [ ] `src/lib/auth/magic-link.ts`
- [ ] `src/app/api/admin/magic-link/route.ts`

**Agent Prompt**:

```
Read work/PR-058/requirements.md and work/PR-058/design.md.
Implement a typed manual magic-link creation function using the existing MagicLink
model, nanoid, normalization, 15-minute expiry, and atomic verification flow.
Create POST /api/admin/magic-link with withRequestContext, withTrace, structured
logging, traced database queries, owner authorization, allowlist validation, and
strict input validation. Never log or return the raw token except inside the
copyable URL response to the authenticated owner.
```

### Phase 2: Owner UI and Resend Removal

**Dependencies**: Phase 1

**Deliverables**:

- [ ] `src/components/auth/manual-magic-link-form.tsx`
- [ ] `src/app/(main)/settings/page.tsx`
- [ ] `src/app/(auth)/login/page.tsx`
- [ ] Remove `src/lib/email/send.ts`
- [ ] Remove `resend` dependency

**Agent Prompt**:

```
Read the existing Settings page, authorization helpers, and login page.
Add an owner-only manual magic-link form with loading/error states and a copy
button. Replace email-delivery guidance with a clear owner-distribution message.
Remove the Resend delivery path and dependency without changing verification,
session, or passkey behavior. Keep the UI mobile-first and accessible.
```

### Phase 3: Documentation, Verification, and Production Recovery

**Dependencies**: Phases 1 and 2

**Deliverables**:

- [ ] Update `docs/AUTH.md` and `docs/ENVIRONMENT.md`
- [ ] Run lint, typecheck, build, and Thai-lint
- [ ] Verify generate → open → session → register passkey
- [ ] Remove obsolete production Resend variables after deployment

**Agent Prompt**:

```
Update permanent authentication and environment documentation for manual
owner-distributed links. Run npm run lint:fix, npm run lint, npm run typecheck,
npm run build, and Thai-lint if available. Verify the one-time token lifecycle
and production recovery flow, then record results here.
```

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Owner generates link | URL displayed, no email call | | [ ] |
| Non-owner attempts generation | HTTP 403 | | [ ] |
| Unallowlisted email | Rejected without token | | [ ] |
| Link opens once | Session created | | [ ] |
| Link reused | Invalid-token response | | [ ] |
| Passkey registration | New credential works on configured domain | | [ ] |

---

## Session Log

### Session 1 - 2026-08-07

**Agent**: Cursor
**Status**: Tracking documents created; implementation pending.

**Completed**:

- [x] Created requirements, design, and progress documents.
- [x] Created feature branch `cursor/manual-magic-links-c785`.

**Next Steps**:

- [ ] Register deliverables.
- [ ] Implement Phase 1.

---

## Cleanup Checklist

- [ ] Remove temporary files or notes.
- [ ] Update permanent docs.
- [ ] Verify `.progress.json` shows PR complete.
- [ ] Final `npm run lint && npm run typecheck` passes.
