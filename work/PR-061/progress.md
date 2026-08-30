# PR-061 — Progress

## Phase 1 — Scopes & shared resolver
- [x] Add `menu:read` / `menu:write` to `OAUTH_SCOPES` + `TOOL_SCOPES` (`src/lib/oauth/types.ts`)
- [x] Add menu scope icons to consent page (`src/app/authorize/page.tsx`)
- [x] Extract `resolveMcpUser` to `src/mcp/tools/utils.ts`; refactor `shopping.ts` to use it

## Phase 2 — Menu tools
- [x] `src/mcp/tools/menu.ts`: `menu_get_week`, `menu_add_dinner`, `menu_remove_assignment`, `menu_send_survey`, `menu_finalize`
- [x] Register in `src/mcp/server.ts`; refresh `MCP_INSTRUCTIONS` (DB-backed) + add Meal-Planning section

## Phase 3 — Tests & docs
- [x] `src/mcp/tools/__tests__/menu.test.ts` (serializer + scope wiring)
- [x] `vitest.config.ts` `@ → ./src` alias
- [x] `docs/MCP.md` scope + tool tables
- [x] `scripts/deliverables.yaml` PR-061 block

## Verification
- [x] `npm run typecheck` — clean
- [x] `npx biome check .` — clean (271 files)
- [x] `npx vitest run` — 33 passed (6 new)
- [x] Thai-lint (CI set: dry, nesting, magic-numbers, perf) on `src/mcp/` — clean

## Session log
- 2026-08-30: Implemented on branch `feat/mcp-menu-tools`. Audit that motivated
  this PR: MCP had zero menu coverage (highest-value gap for the owner's
  weekly-planning workflow). Deferred to follow-ups: PR-062 auth-context/authz
  parity, PR-063 git-sync data-loss disarm, PR-064 connector productionization.
