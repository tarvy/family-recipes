# PR-029: Add `recipe_create` MCP Tool - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-01-30
> **Target**: 2026-01-30
> **Branch**: `feat/029-recipe-create-tool`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | |
| Design | [x] Approved | |
| Implementation | [x] Complete | |
| Testing | [x] Manual verification | TypeScript compiles, lint passes |
| Documentation | [x] N/A | |
| Cleanup | [x] Ready for merge | |

---

## Deliverables Checklist

- [x] `src/lib/oauth/types.ts` - Add `recipe_create` to TOOL_SCOPES
- [x] `src/mcp/tools/recipes.ts` - Implement `recipe_create` tool

---

## Implementation Phases

### Phase 1: Add TOOL_SCOPES Entry

**Dependencies**: PR-028 complete

**Deliverables**:
- [ ] TOOL_SCOPES entry for recipe_create

**Agent Prompt**:
```
Context:
- Read: src/lib/oauth/types.ts
- Ensure PR-028 is complete (recipes:write scope exists)

Task:
1. Add recipe_create to TOOL_SCOPES requiring ['recipes:write']

Verification:
- [ ] `npm run typecheck` passes

Output:
- Files modified: src/lib/oauth/types.ts
```

---

### Phase 2: Implement recipe_create Tool

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `recipe_create` tool registered in recipes.ts

**Agent Prompt**:
```
Context:
- Read: src/mcp/tools/recipes.ts, src/mcp/tools/shopping.ts
- Read: src/lib/recipes/writer.ts, src/lib/recipes/loader.ts
- Read: work/PR-029/design.md

Task:
1. Import writeRawCooklangContent from @/lib/recipes/writer
2. Import getCategories from @/lib/recipes/loader
3. Import parseCooklang from @/lib/cooklang/parser
4. Add recipe_create tool with:
   - Input: content (string), category (string)
   - Output: success (boolean), slug (string optional), error (string optional)
5. Implementation:
   a. Validate category against getCategories()
   b. Parse content with parseCooklang() to get slug
   c. Write with writeRawCooklangContent(content, category, slug)
   d. Return { success: true, slug }
6. Add tracing and logging following existing patterns

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

Output:
- Files modified: src/mcp/tools/recipes.ts
```

---

## Test Plan

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| Create recipe with valid Cooklang | File created, slug returned | [ ] |
| Create with invalid category | Error message, no file | [ ] |
| Create with malformed Cooklang | Parse error returned | [ ] |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements
- [ ] Logger used for all output

---

## Session Log

(Sessions will be logged here as work progresses)
