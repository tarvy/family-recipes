# PR-040: Audit Logging - Progress

## Phase 1: Model + Types + Helper
- [ ] Add audit types to `src/db/types/index.ts`
- [ ] Create `src/db/models/audit-log.model.ts`
- [ ] Update barrel exports in `src/db/models/index.ts`
- [ ] Create `src/lib/audit.ts`

## Phase 2: CLI
- [ ] Create `scripts/logs.ts`
- [ ] Add `logs` script to `package.json`

## Phase 3: Integration
- [ ] Add `source` param to `updateRecipe` and `deleteRecipe`
- [ ] Pass `'mcp'` from MCP tools
- [ ] Insert `audit()` calls in repository.ts

## Phase 4: Documentation + Tracking
- [ ] Update `docs/OBSERVABILITY.md`
- [ ] Update `scripts/deliverables.yaml`
- [ ] Run lint + typecheck
