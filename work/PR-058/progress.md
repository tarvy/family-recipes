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
| Implementation | [x] In Progress | Core route, UI, CLI, and Resend removal complete |
| Testing | [x] Unit [ ] Integration [ ] E2E | Lint, typecheck, and build pass; Thai-lint unavailable |
| Documentation | [x] Updated [ ] Reviewed | Auth, environment, MCP, and testing docs updated |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

- [x] `src/lib/auth/magic-link.ts` - Manual token creation without email delivery
- [x] `src/app/api/admin/magic-link/route.ts` - Owner-only generation endpoint
- [x] `src/components/auth/manual-magic-link-form.tsx` - Copyable link UI
- [x] `src/app/(main)/settings/page.tsx` - Owner-only form integration
- [x] `src/app/(auth)/login/page.tsx` - Resend-free login guidance
- [x] `src/lib/email/send.ts` - Removed
- [x] `docs/AUTH.md` - Manual distribution flow documented
- [x] `docs/ENVIRONMENT.md` - Resend configuration removed
- [x] `package.json` / `package-lock.json` - Resend dependency removed
- [x] `scripts/create-magic-link.ts` - Recovery CLI
- [ ] `src/app/api/auth/passkey/[id]/route.ts` - Authenticated passkey revocation
- [ ] `src/components/auth/passkey-manager.tsx` - Confirmed delete controls
- [x] Automated checks - lint, typecheck, build

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

### Phase 4: Passkey Revocation

**Dependencies**: Phase 2

**Deliverables**:

- [ ] `src/app/api/auth/passkey/[id]/route.ts`
- [ ] `src/components/auth/passkey-manager.tsx`

**Agent Prompt**:

```
Read the passkey model, session helpers, Settings page, and PR-058 requirements
and design. Add DELETE /api/auth/passkey/[id] with session authentication,
ObjectId validation, a userId-scoped Mongoose delete, traced database access,
structured logging, and explicit 401/400/404 responses. Add an accessible,
confirmed delete action to each passkey in PasskeyManager. Refresh the list after
successful deletion and preserve existing registration behavior.
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
| Passkey deletion | Confirmed deletion removes only selected credential | | [ ] |

---

## Session Log

### Session 1 - 2026-08-07

**Agent**: Cursor
**Status**: Implementation complete; awaiting deployment and production verification.

**Completed**:

- [x] Created requirements, design, and progress documents.
- [x] Created feature branch `cursor/manual-magic-links-c785`.
- [x] Added owner-only API and Settings UI for manual link generation.
- [x] Added CLI recovery path for initial owner access.
- [x] Removed Resend runtime dependency and email login flow.
- [x] Passed Biome lint, TypeScript typecheck, and production build.

**Next Steps**:

- [ ] Register deliverables.
- [ ] Deploy and verify the production owner recovery flow.
- [ ] Remove obsolete Resend variables from Vercel after deployment.

---

## Cleanup Checklist

- [ ] Remove temporary files or notes.
- [ ] Update permanent docs.
- [ ] Verify `.progress.json` shows PR complete.
- [ ] Final `npm run lint && npm run typecheck` passes.
