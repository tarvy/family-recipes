# PR-028: Add `recipes:write` OAuth Scope - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-01-30
> **Target**: 2026-01-30
> **Branch**: `feat/028-recipes-write-scope`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | |
| Design | [x] Approved | |
| Implementation | [x] Complete | |
| Testing | [x] Manual verification | TypeScript compiles, lint passes |
| Documentation | [x] Update MCP instructions | |
| Cleanup | [x] Ready for merge | |

---

## Deliverables Checklist

- [x] `src/lib/oauth/types.ts` - Add `recipes:write` scope to `OAUTH_SCOPES`
- [x] `src/mcp/server.ts` - Update MCP_INSTRUCTIONS with writing recipes section

---

## Implementation Phases

### Phase 1: Add OAuth Scope

**Dependencies**: None

**Deliverables**:
- [ ] `src/lib/oauth/types.ts` updated

**Agent Prompt**:
```
Context:
- Read: work/PR-028/requirements.md, work/PR-028/design.md
- Reference: src/lib/oauth/types.ts

Task:
1. Add 'recipes:write' to OAUTH_SCOPES with description "Create and modify recipes"
2. Place it after 'recipes:read' for logical grouping

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] OAuthScope type now includes 'recipes:write'

Output:
- Files modified: src/lib/oauth/types.ts
```

---

### Phase 2: Update MCP Instructions

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/mcp/server.ts` updated

**Agent Prompt**:
```
Context:
- Read: src/mcp/server.ts
- Reference: work/PR-028/design.md

Task:
1. Add a "## Coming Soon" section to MCP_INSTRUCTIONS
2. List recipe_create and recipe_update tools with brief descriptions
3. Note they require recipes:write scope

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

Output:
- Files modified: src/mcp/server.ts
```

---

## Test Plan

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| `VALID_SCOPES` includes 'recipes:write' | Array contains scope | [ ] |
| `OAUTH_SCOPES['recipes:write']` returns description | "Create and modify recipes" | [ ] |
| TypeScript compiles | No errors | [ ] |
| Lint passes | No violations | [ ] |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements

---

## Session Log

(Sessions will be logged here as work progresses)
