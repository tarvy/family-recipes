# PR-060: MCP Auth Plane Migration - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-08-08
> **Target**: 2026-08-08
> **Branch**: `cursor/mcp-auth-resource-migration`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | See `requirements.md` |
| Design | [x] Approved | See `design.md` |
| Implementation | [x] Complete | RS256/JWKS resource-server path + mail scope removal |
| Testing | [x] Unit | `npm run test` (vitest, new to this repo) |
| Documentation | [x] Updated | `docs/MCP.md`, `docs/ENVIRONMENT.md`, `docs/AUTH.md`, `.env.example` |
| Cleanup | [x] Ready for merge | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass |

---

## Deliverables Checklist

From `scripts/deliverables.yaml` (PR-060 registered there):

- [x] `src/lib/oauth/resource-server.ts` - mode resolution, RS256/JWKS verification, protected-resource metadata builder
- [x] `src/lib/oauth/mcp-auth.ts` - async `verifyMcpAuth`, dual-mode dispatch
- [x] `src/lib/oauth/types.ts` - remove `mail:read`/`mail:write` from `OAUTH_SCOPES`
- [x] `src/lib/oauth/index.ts` - export new resource-server API
- [x] `src/app/mcp/route.ts` - await auth, `WWW-Authenticate` on 401
- [x] `src/app/.well-known/oauth-protected-resource/mcp/route.ts`
- [x] `src/app/.well-known/oauth-protected-resource/route.ts`
- [x] `src/app/api/mcp/.well-known/oauth-protected-resource/route.ts`
- [x] `src/app/authorize/page.tsx` - remove mail scope icons
- [x] `examples/seed-recipes-resource.json`
- [x] `docs/MCP.md`, `docs/ENVIRONMENT.md`, `docs/AUTH.md`, `.env.example`
- [x] `vitest.config.ts`, `src/lib/oauth/__tests__/resource-server.test.ts`, `src/lib/oauth/__tests__/types.test.ts`
- [x] `.github/workflows/ci.yml` - add `test` job
- [x] `scripts/deliverables.yaml` - register PR-060

---

## Implementation Phases

### Phase 1: Dependencies + scope removal

**Dependencies**: None.

1. Add `jose` (runtime) and `vitest` (dev) to `package.json`.
2. Remove `mail:read`/`mail:write` from `OAUTH_SCOPES` in `src/lib/oauth/types.ts`.
3. Remove the corresponding `SCOPE_ICONS` entries in `src/app/authorize/page.tsx`.

**Verification**: `npm run lint`, `npm run typecheck`.

### Phase 2: RS256/JWKS resource-server verification

**Dependencies**: Phase 1.

1. New `src/lib/oauth/resource-server.ts`: `resolveMcpAuthMode`,
   `getMcpAuthIssuer`, `getMcpResourceUrl`, `verifyMcpAuthResourceToken`,
   `buildProtectedResourceMetadata`.
2. Update `src/lib/oauth/mcp-auth.ts`: `verifyMcpAuth` becomes async,
   dispatches to legacy (`verifyAccessToken`) or mcp-auth verification.
3. Update `src/app/mcp/route.ts` to `await verifyMcpAuth(...)` and add
   `WWW-Authenticate` on 401 responses.

**Verification**: `npm run typecheck`; unit tests in Phase 4.

### Phase 3: RFC 9728 protected-resource metadata

**Dependencies**: Phase 2.

1. New routes at `/.well-known/oauth-protected-resource/mcp`,
   `/.well-known/oauth-protected-resource`, and the MCP-relative re-export.

**Verification**: manual `curl` once deployed; unit test on the pure
metadata builder function.

### Phase 4: Tests + CI

**Dependencies**: Phases 1-3.

1. `vitest.config.ts` + `test`/`test:watch` scripts.
2. `src/lib/oauth/__tests__/resource-server.test.ts`,
   `src/lib/oauth/__tests__/types.test.ts`.
3. Add a `test` job to `.github/workflows/ci.yml`.

**Verification**: `npm run test`.

### Phase 5: Docs + seed example + deliverables

**Dependencies**: Phases 1-4.

1. `docs/MCP.md`: document `MCP_AUTH_MODE`, env vars, migration + rollback
   steps, remove mail scope table rows.
2. `docs/ENVIRONMENT.md`: document new env vars.
3. `docs/AUTH.md`: one-line note clarifying MCP auth boundary vs. web login.
4. `.env.example`: add new optional vars (commented).
5. `examples/seed-recipes-resource.json`.
6. `scripts/deliverables.yaml`: register PR-060.

**Verification**: `python scripts/progress.py`.

---

## Test Plan

### Unit Tests

| Test | File | Status | Notes |
|------|------|--------|-------|
| Mode resolution (explicit + inferred) | `src/lib/oauth/__tests__/resource-server.test.ts` | Pass | |
| RS256 JWKS happy path | `src/lib/oauth/__tests__/resource-server.test.ts` | Pass | local JWKS, no network |
| Audience isolation (mail-resource token rejected) | `src/lib/oauth/__tests__/resource-server.test.ts` | Pass | |
| Expired / wrong-issuer / malformed token rejected | `src/lib/oauth/__tests__/resource-server.test.ts` | Pass | |
| Protected-resource metadata shape | `src/lib/oauth/__tests__/resource-server.test.ts` | Pass | |
| Mail scopes removed | `src/lib/oauth/__tests__/types.test.ts` | Pass | regression guard |

**Run**: `npm run test`

### Manual Verification (post-deploy, operator)

| Check | Expected | Status |
|-------|----------|--------|
| `curl .../.well-known/oauth-protected-resource/mcp` | 200 JSON, `authorization_servers` includes mcp-auth issuer once `MCP_RESOURCE_URL` is set | [ ] Pending deploy |
| MCP client using an mcp-auth-issued token can call `recipe_list` | Success | [ ] Pending deploy |
| MCP client using a Newt mail-resource token against Family Recipes `/mcp` | 401 | [ ] Pending deploy |
| Web login (magic link, passkey) still works | Unaffected | [ ] Pending manual check |
| `MCP_AUTH_MODE=legacy` rollback | Family Recipes' own AS works exactly as before | [ ] Pending deploy |

---

## Completion Confidence

### Automated Checks
- [x] Deliverables registered in `scripts/deliverables.yaml`
- [x] `npm run lint` - All files pass Biome (0 errors, 0 warnings)
- [x] `npm run typecheck` - No TypeScript errors
- [x] `npm run test` - 27/27 tests pass (2 files)
- [x] `npm run build` - Production build succeeds; new `.well-known` routes
  registered
- [x] `python scripts/progress.py` - PR-060 shows complete (49/50 PRs, 97%
  overall checks; the one remaining "not started" PR is PR-057, unrelated to
  this change)

### Quality Checks
- [ ] Thai-lint (not runnable in this sandbox; no Python/pip network
  assumed - documented as a CI-only check per existing repo convention)
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] Documentation updated

### Integration Checks
- [ ] Feature works in dev environment (manual, requires mcp-auth instance)
- [ ] No regression in existing features (web login untouched by design -
  no shared code path)

---

## Session Log

### Session 1 - 2026-08-08

**Agent**: Cursor Agent
**Duration**: single session

**Completed**:
- [x] Explored Family Recipes MCP/OAuth code, mcp-auth repo, and the
  already-migrated Newt sibling implementation for the pattern to mirror.
- [x] Discovered `main` had advanced mid-task to include PR-058 (design
  system) and PR-059 (mail scope delegation) - re-planned around PR-060 as
  the next available number and confirmed PR-059 is exactly the coupling
  this PR removes.
- [x] Implementation phases 1-5 (see above).

**Issues Encountered**:
- No test runner existed in this repo before this PR; added `vitest`
  rather than skipping the explicit test requirement.
- Family Recipes never independently defined mail tool scopes beyond the
  PR-059 registry entries (no `mail_*` MCP tools exist here) - removal is
  a pure scope-registry change with no tool-layer impact.

- [x] Final `npm run lint && npm run typecheck && npm run test && npm run build`
  - fixed `noPropertyAccessFromIndexSignature` violations on `process.env.*`
    access (bracket notation), Biome formatting/import-order, and a
    `noDelete` warning in the test file.
- [x] Commit, push, open PR.

**Next Steps**:
- [ ] Operator: register the resource with mcp-auth, set `MCP_RESOURCE_URL`
  in the Family Recipes deployment, verify per docs/MCP.md.

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-060-mcp-auth-migration/` directory (or archive) once
  merged, per repository policy - left in place for this PR's review.
- [ ] Update permanent docs (`docs/*.md`) with any new information (done).
- [ ] Remove any debug code or test data.
- [ ] Verify `.progress.json` shows PR-060 complete.
- [ ] Final `npm run lint && npm run typecheck` passes.
