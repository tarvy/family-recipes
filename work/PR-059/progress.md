# PR-059: Mail OAuth Scope Delegation - Progress

> **Status**: Complete
> **Started**: 2026-08-08
> **Target**: 2026-08-08
> **Branch**: `cursor/oauth-mail-scopes`

## Progress Overview

| Phase | Status | Notes |
|---|---|---|
| Requirements | [x] Approved | Newt integration scope defined |
| Design | [x] Approved | Reuses existing OAuth provider |
| Implementation | [x] Complete | Added two canonical delegated scopes |
| Testing | [x] Unit [ ] Integration [ ] E2E | Lint and typecheck pass |
| Documentation | [x] Updated [x] Reviewed | MCP scope boundary documented |
| Cleanup | [ ] Temp files removed [x] Ready for merge | Work tracking retained per repository policy |

## Deliverables Checklist

- [x] `src/lib/oauth/types.ts` — add delegated mail scopes.
- [x] `docs/MCP.md` — document scope delegation boundary.
- [x] `scripts/deliverables.yaml` — register PR-059.

## Implementation Phases

### Phase 1: Scope registry

**Dependencies**: None.

**Task**:

1. Add `mail:read` and `mail:write` to `OAUTH_SCOPES`.
2. Keep `TOOL_SCOPES` unchanged.
3. Confirm discovery metadata reads from the canonical registry.

**Verification**:

- `npm run lint`
- `npm run typecheck`

### Phase 2: Documentation and checks

**Dependencies**: Phase 1.

**Task**:

1. Update `docs/MCP.md`.
2. Run the progress script.
3. Review the diff for unrelated changes.

**Verification**:

- OAuth discovery includes both delegated scopes.
- Existing recipe scopes remain present.
- No secrets are present.

## Session Log

### Session 1 — 2026-08-08

**Agent**: Cursor

**Completed**:

- [x] Created requirements and design documents.
- [x] Created this progress tracker.

**Completed**:

- [x] Implemented the scope registry.
- [x] Updated documentation and deliverables.
- [x] Ran lint, typecheck, and progress checks.

**Next Steps**:

- [ ] Configure Newt with the Family Recipes issuer and verification secret.
- [ ] Test OAuth from Claude web/Desktop and then Claude mobile.
