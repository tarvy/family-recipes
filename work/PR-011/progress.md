# PR-011: Recipe UI - List & Search - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-01-27
> **Branch**: `feat/011-recipe-list-search`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Completed 2026-01-27 |
| Design | [x] Draft [ ] Review [ ] Approved | Completed 2026-01-27 |
| Implementation | [ ] Not Started [ ] In Progress [ ] Complete | |
| Testing | [ ] Manual verification | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | Remove work/PR-011 after merge |

---

## Deliverables Checklist

From `scripts/progress.py` PR definition:

- [ ] `src/components/recipes/recipe-card.tsx` - Single recipe card component
- [ ] `src/components/recipes/recipe-grid.tsx` - Responsive grid layout
- [ ] `src/components/recipes/recipe-filters.tsx` - Search + category filter
- [ ] `src/app/(main)/recipes/page.tsx` - Main recipes browse page

---

## Implementation Phases

### Phase 1: Recipe Loader

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/lib/recipes/loader.ts` - Load recipes from filesystem

**Agent Prompt**:
```
Context:
- Read: work/PR-011/requirements.md, work/PR-011/design.md
- Reference: src/lib/cooklang/parser.ts, src/lib/git-recipes/file-scanner.ts

Task:
Create a recipe loader that reads .cook files from the recipes/ directory
and returns parsed recipe metadata for display.

1. Create src/lib/recipes/loader.ts with:
   - getAllRecipes(): Promise<RecipePreview[]> - returns all recipes
   - getRecipeCategories(): string[] - returns unique categories from directory names

2. RecipePreview type should include:
   - slug, title, category, prepTime, cookTime, description (first 100 chars)

3. Use existing cooklang parser from src/lib/cooklang/parser.ts

4. Category should be extracted from the directory name (entrees, desserts, etc.)

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Can import and call getAllRecipes() without error

Output:
- Files created: src/lib/recipes/loader.ts
```

---

### Phase 2: Recipe Card Component

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/components/recipes/recipe-card.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-011/design.md (Recipe Card Design section)
- Reference: src/lib/recipes/loader.ts (RecipePreview type)

Task:
Create the RecipeCard component for displaying a recipe preview.

1. Create src/components/recipes/recipe-card.tsx with:
   - Props: recipe (RecipePreview from loader)
   - Link wrapper to /recipes/[slug]
   - Display: title, category badge, prep/cook time
   - Placeholder colored background based on category

2. Styling with Tailwind:
   - Rounded corners, subtle shadow
   - Hover effect (scale + shadow)
   - Focus ring for accessibility
   - Category badge with distinct colors per category

3. Category color mapping:
   - entrees: blue
   - desserts: pink
   - soups: orange
   - sides: green
   - salads: emerald
   - breakfast: yellow

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Component renders without error in isolation

Output:
- Files created: src/components/recipes/recipe-card.tsx
```

---

### Phase 3: Recipe Grid & Filters

**Dependencies**: Phase 2

**Deliverables**:
- [ ] `src/components/recipes/recipe-grid.tsx`
- [ ] `src/components/recipes/recipe-filters.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-011/design.md (Filter Component Design section)
- Reference: src/components/recipes/recipe-card.tsx

Task:
Create the grid layout and filter components.

1. Create src/components/recipes/recipe-grid.tsx:
   - Props: recipes (RecipePreview[])
   - Responsive grid: 1 col mobile, 2 col tablet, 3-4 col desktop
   - Map recipes to RecipeCard components
   - Empty state when no recipes

2. Create src/components/recipes/recipe-filters.tsx:
   - "use client" directive (needs interactivity)
   - Props: categories (string[]), onFilterChange callback
   - Search input with debounce (300ms)
   - Category pill buttons (single-select)
   - URL state with useSearchParams

3. URL integration:
   - Read initial values from URL (?category=X&q=Y)
   - Update URL on filter change (shallow navigation)

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Grid is responsive at 375px, 768px, 1280px

Output:
- Files created: src/components/recipes/recipe-grid.tsx, src/components/recipes/recipe-filters.tsx
```

---

### Phase 4: Recipes Page

**Dependencies**: Phase 3

**Deliverables**:
- [ ] `src/app/(main)/recipes/page.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-011/design.md (Component Hierarchy section)
- Reference: All components created in previous phases

Task:
Create the main recipes browse page.

1. Create src/app/(main)/recipes/page.tsx:
   - Server component that loads all recipes
   - Passes data to client components
   - Page title and metadata

2. Integration:
   - Load recipes using getAllRecipes()
   - Extract categories using getRecipeCategories()
   - Render RecipeFilters + RecipeGrid
   - Client-side filtering logic

3. May need wrapper client component (RecipeBrowser) for state management

4. Add appropriate observability:
   - Log recipe count on load
   - Use withTrace if async operations

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Page loads at /recipes showing all 84 recipes
- [ ] Category filter works
- [ ] Search filter works
- [ ] URL updates with filters

Output:
- Files created: src/app/(main)/recipes/page.tsx
- Files created (optional): src/components/recipes/recipe-browser.tsx
```

---

## Parallel Work Streams

Not applicable - phases are sequential.

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Page loads | Shows 84 recipe cards | | [ ] Pass [ ] Fail |
| Entrees filter | Shows 53 recipes | | [ ] Pass [ ] Fail |
| Desserts filter | Shows 17 recipes | | [ ] Pass [ ] Fail |
| Soups filter | Shows 6 recipes | | [ ] Pass [ ] Fail |
| Sides filter | Shows 6 recipes | | [ ] Pass [ ] Fail |
| Salads filter | Shows 1 recipe | | [ ] Pass [ ] Fail |
| Breakfast filter | Shows 1 recipe | | [ ] Pass [ ] Fail |
| Search "chicken" | Returns chicken recipes | | [ ] Pass [ ] Fail |
| Search "soup" | Returns soup recipes | | [ ] Pass [ ] Fail |
| Mobile (375px) | Single column grid | | [ ] Pass [ ] Fail |
| Desktop (1280px) | Multi-column grid | | [ ] Pass [ ] Fail |
| URL persistence | Filters reflected in URL | | [ ] Pass [ ] Fail |
| Card click | Navigates to /recipes/[slug] | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `npm run build` - Next.js build succeeds
- [ ] `python scripts/progress.py` - PR-011 shows complete

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] Observability: logging added for recipe load

### Integration Checks
- [ ] Feature works in dev environment
- [ ] Mobile responsive (tested at 375px)

---

## Session Log

### Session 1 - 2026-01-27

**Agent**: Claude Code
**Duration**: Scoping session

**Completed**:
- [x] Created work/PR-011/ directory
- [x] Wrote requirements.md
- [x] Wrote design.md
- [x] Wrote progress.md

**Issues Encountered**:
- None

**Next Steps**:
- [ ] User approval of scope
- [ ] Begin Phase 1: Recipe Loader

### Session 2 - 2026-01-30

**Agent**: Codex
**Duration**: Short update

**Completed**:
- [x] Adjusted recipe card time display to show prep/cook separately when both are present

**Issues Encountered**:
- None

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-011/` directory
- [ ] Verify `scripts/progress.py` shows PR-011 complete
- [ ] Final `npm run lint && npm run typecheck && npm run build` passes
