# PR-066: MCP Tool Output Schema Mismatches - Progress

> **Status**: Ready for review
> **Branch**: `fix/mcp-output-schemas`

- [x] Root cause confirmed (test reproduces the exact client error on the old schema)
- [x] `recipeDetailSchema` declares `updatedAt`, `rating`, `cookLog`, step `ingredients`
- [x] Audit of all 15 tools; null hardening in `toRecipeSummary`
- [x] `src/mcp/__tests__/output-schemas.test.ts`
- [x] `docs/MCP.md`
- [x] lint, typecheck, test, build

## Session log

- 2026-10-04: Implemented. Only `recipe_get` had an additional-properties
  mismatch; all other tools' outputs already matched.
