# PR-025: Simplified Cooklang-First Recipe Edit Flow - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-01-29
> **Target**: 2026-01-29
> **Branch**: `claude/simplify-recipe-edit-flow-rViYR`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [x] Review [x] Approved | Complete |
| Design | [x] Draft [x] Review [x] Approved | Complete |
| Implementation | [ ] Not Started [x] In Progress [ ] Complete | Starting Phase 1 |
| Testing | [ ] Unit [ ] Integration [ ] E2E | Pending |
| Documentation | [ ] Updated [ ] Reviewed | Pending |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | Pending |

---

## Deliverables Checklist

- [ ] `src/components/recipes/cooklang-editor.tsx` - Main editor component
- [ ] `src/components/recipes/cooklang-preview.tsx` - Live preview pane
- [ ] `src/components/recipes/ingredient-popover.tsx` - Ingredient insertion helper
- [ ] `src/components/recipes/syntax-help.tsx` - Collapsible syntax reference
- [ ] `src/components/recipes/metadata-bar.tsx` - Minimal metadata fields
- [ ] `src/lib/cooklang/metadata.ts` - Metadata extraction utilities
- [ ] `src/lib/recipes/loader.ts` - Add getRawCooklangContent function
- [ ] `src/lib/recipes/writer.ts` - Add writeRawCooklangContent function
- [ ] `src/app/api/recipes/route.ts` - Modify to accept raw content
- [ ] `src/app/api/recipes/[slug]/route.ts` - Modify to accept raw content
- [ ] `src/app/(main)/recipes/[slug]/edit/page.tsx` - Use new editor
- [ ] `src/app/(main)/recipes/new/page.tsx` - Use new editor

---

## Implementation Phases

### Phase 1: Core Utilities and Loader

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/lib/cooklang/metadata.ts`
- [ ] `src/lib/recipes/loader.ts` modifications
- [ ] `src/lib/recipes/writer.ts` modifications

**Tasks**:
1. Create `metadata.ts` with functions:
   - `extractMetadataFromContent(content: string)` - parse >> lines
   - `buildCooklangContent(metadata, body)` - reconstruct full content
   - `splitMetadataAndBody(content: string)` - separate for editor
2. Add `getRawCooklangContent(slug: string)` to loader.ts
3. Add `writeRawCooklangContent(content: string, category: string, slug: string)` to writer.ts

**Verification**:
- [ ] `npm run typecheck` passes
- [ ] Can load raw content of existing recipe
- [ ] Can write raw content and read back identically

---

### Phase 2: CooklangEditor Component

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/components/recipes/cooklang-editor.tsx`
- [ ] `src/components/recipes/syntax-help.tsx`

**Tasks**:
1. Create `CooklangEditor` with:
   - Monospace textarea for Cooklang body
   - Insert buttons for @, #, ~ symbols
   - Cursor position tracking for insertion
   - onChange callback with content
2. Create `SyntaxHelp` collapsible panel with:
   - Quick reference for Cooklang syntax
   - Examples for ingredients, cookware, timers, metadata

**Verification**:
- [ ] Component renders textarea
- [ ] Insert buttons add symbols at cursor
- [ ] Syntax help toggles visibility

---

### Phase 3: CooklangPreview Component

**Dependencies**: Phase 1 (uses parser)

**Deliverables**:
- [ ] `src/components/recipes/cooklang-preview.tsx`

**Tasks**:
1. Create `CooklangPreview` with:
   - Accept raw Cooklang content as prop
   - Parse content using existing parser
   - Display rendered steps (plain text, ingredients highlighted)
   - Display extracted ingredients list
   - Show parse errors if content invalid

**Verification**:
- [ ] Preview updates as content changes
- [ ] Ingredients extracted and displayed
- [ ] Parse errors shown helpfully

---

### Phase 4: IngredientPopover Component

**Dependencies**: Phase 2 (needs editor integration)

**Deliverables**:
- [ ] `src/components/recipes/ingredient-popover.tsx`

**Tasks**:
1. Create `IngredientPopover` with:
   - Name, quantity, unit input fields
   - Preview of formatted Cooklang syntax
   - Insert button that calls callback with formatted string
   - Handles multi-word names (adds {} when needed)

**Verification**:
- [ ] Popover opens/closes correctly
- [ ] Generates correct Cooklang syntax
- [ ] Multi-word names handled properly

---

### Phase 5: MetadataBar Component

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/components/recipes/metadata-bar.tsx`

**Tasks**:
1. Create `MetadataBar` with:
   - Title input (required)
   - Category select (required)
   - Servings, prep time, cook time inputs (optional)
   - Compact horizontal layout
   - onChange callback for each field

**Verification**:
- [ ] All fields render and update state
- [ ] Category dropdown shows valid options
- [ ] Compact layout works on mobile

---

### Phase 6: RecipeEditorForm Integration

**Dependencies**: Phases 2, 3, 4, 5

**Deliverables**:
- [ ] `src/components/recipes/recipe-editor-form.tsx` (new form component)

**Tasks**:
1. Create `RecipeEditorForm` that combines:
   - MetadataBar at top
   - Split view: CooklangEditor (left) + CooklangPreview (right)
   - IngredientPopover (modal overlay)
   - Submit button bar
2. State management:
   - Sync metadata bar ↔ content >> lines
   - Track cursor position for insertions
   - Debounced preview parsing

**Verification**:
- [ ] All components work together
- [ ] Metadata syncs with content
- [ ] Preview updates on changes

---

### Phase 7: API Route Modifications

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/app/api/recipes/route.ts` modifications
- [ ] `src/app/api/recipes/[slug]/route.ts` modifications

**Tasks**:
1. Modify POST /api/recipes to:
   - Accept `{ content: string, category: string }`
   - Parse content to validate and extract title/slug
   - Write raw content to file
2. Modify PUT /api/recipes/[slug] to:
   - Accept `{ content: string, category: string }`
   - Parse content to validate
   - Handle file relocation if category/slug changes
   - Write raw content to file

**Verification**:
- [ ] Create recipe with raw content works
- [ ] Update recipe preserves exact content
- [ ] Validation errors return helpful messages

---

### Phase 8: Page Integration

**Dependencies**: Phases 6, 7

**Deliverables**:
- [ ] `src/app/(main)/recipes/[slug]/edit/page.tsx` modifications
- [ ] `src/app/(main)/recipes/new/page.tsx` modifications

**Tasks**:
1. Modify edit page to:
   - Load raw content via getRawCooklangContent
   - Use RecipeEditorForm instead of RecipeForm
   - Pass raw content as initial value
2. Modify new page to:
   - Use RecipeEditorForm in create mode
   - Provide starter template

**Verification**:
- [ ] Edit page loads and displays raw content
- [ ] New page shows empty editor with template
- [ ] Save/cancel navigation works

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 1 (Utilities) ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 7 (API)       ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░
                            ↓
─────────────────────────────────────────────────────────────
Stream A: UI Components (can run in parallel)
Phase 2 (Editor)    ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 (Preview)   ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░
Phase 4 (Popover)   ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░
Phase 5 (Metadata)  ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░
─────────────────────────────────────────────────────────────
Phase 6 (Integrate) ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░
Phase 8 (Pages)     ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░
─────────────────────────────────────────────────────────────
```

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Load existing recipe for edit | Raw Cooklang visible | | [ ] |
| Preview shows ingredients | Extracted list displays | | [ ] |
| Insert ingredient via popover | Correct syntax at cursor | | [ ] |
| Save recipe | Content preserved exactly | | [ ] |
| Create new recipe | File created with content | | [ ] |
| Mobile layout | Stacked editor/preview | | [ ] |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run build` - Build succeeds

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] Components follow existing patterns

### Integration Checks
- [ ] Edit round-trip preserves content
- [ ] Works with all existing recipes
- [ ] Mobile responsive (tested at 375px)

---

## Session Log

### Session 1 - 2026-01-29

**Agent**: Claude Code
**Duration**: Active

**Completed**:
- [x] Created PR-025 directory
- [x] Created requirements.md with BDD scenarios
- [x] Created design.md with architecture
- [x] Created progress.md with phases

**In Progress**:
- [ ] Phase 1: Core utilities

**Next Steps**:
- Implement metadata.ts utilities
- Add raw content loader/writer functions
- Build UI components

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-025/` directory after merge
- [ ] Remove deprecated components if no longer used
- [ ] Final `npm run lint && npm run typecheck` passes
