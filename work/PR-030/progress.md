# PR-030: Add `recipe_update` MCP Tool - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-01-30
> **Target**: 2026-01-30
> **Branch**: `feat/030-recipe-update-tool`

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

- [x] `src/lib/oauth/types.ts` - Add `recipe_update` to TOOL_SCOPES
- [x] `src/mcp/tools/recipes.ts` - Implement `recipe_update` tool

---

## Implementation Phases

### Phase 1: Add TOOL_SCOPES Entry

**Dependencies**: PR-029 complete

**Deliverables**:
- [ ] TOOL_SCOPES entry for recipe_update

**Agent Prompt**:
```
Context:
- Read: src/lib/oauth/types.ts

Task:
1. Add recipe_update to TOOL_SCOPES requiring ['recipes:write']

Verification:
- [ ] `npm run typecheck` passes

Output:
- Files modified: src/lib/oauth/types.ts
```

---

### Phase 2: Implement recipe_update Tool

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `recipe_update` tool registered in recipes.ts

**Agent Prompt**:
```
Context:
- Read: src/mcp/tools/recipes.ts
- Read: src/lib/recipes/writer.ts, src/lib/recipes/loader.ts
- Read: work/PR-030/design.md

Task:
1. Import deleteRecipeFile from @/lib/recipes/writer
2. Import getRawCooklangContent from @/lib/recipes/loader
3. Add recipe_update tool with:
   - Input: slug (string), content (string), category (string)
   - Output: success (boolean), slug (string optional), error (string optional)
4. Implementation:
   a. Check recipe exists with getRawCooklangContent(slug)
   b. Validate category against getCategories()
   c. Parse new content to get new slug
   d. If slug changes, check for collision
   e. Delete old file if slug or category changed
   f. Write new content
   g. Return { success: true, slug: newSlug }
5. Add tracing and logging following existing patterns

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
| Update content only | File content replaced | [ ] |
| Update with title change | Old deleted, new created | [ ] |
| Move to different category | File in new location | [ ] |
| Update nonexistent recipe | Error returned | [ ] |
| Rename to existing slug | Collision error | [ ] |

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
