# PR-033: Recipe Detail Responsive Layout - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-02-04
> **Target**: —
> **Branch**: `feat/033-recipe-detail-responsive`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | |
| Design | [x] Draft [ ] Review [ ] Approved | |
| Implementation | [ ] Not Started [ ] In Progress [x] Complete | All phases done |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

From `scripts/deliverables.yaml`:

- [x] `src/lib/recipes/loader.ts` - Add ingredients to RecipeDetail.steps (BLOCKER FIX)
- [x] `src/components/recipes/recipe-detail-client.tsx` - Client wrapper with shared state
- [x] `src/components/recipes/recipe-content-layout.tsx` - Responsive two-column grid
- [x] `src/components/recipes/interactive-step-list.tsx` - Steps with tappable ingredients
- [x] `src/components/recipes/ingredient-tooltip.tsx` - Ingredient popover

---

## Implementation Phases

### Phase 0: Data Model Fix (BLOCKER)

**Dependencies**: None (must complete first)

**Deliverables**:
- [x] `src/lib/recipes/loader.ts` - RecipeDetail interface and convertStepsForDetail()

**Agent Prompt**:
```
Context:
- Read: work/PR-033/design.md (Critical Prerequisite section)
- Reference: src/lib/recipes/loader.ts, src/db/types/index.ts (IStep interface)

Task:
1. Update RecipeDetail interface in src/lib/recipes/loader.ts:
   - Add ingredients array to steps type:
     steps: Array<{
       text: string;
       timers?: Array<{ duration: number; unit: string }>;
       ingredients?: Array<{ name: string; quantity?: string; unit?: string }>;
     }>;

2. Update convertStepsForDetail() function to preserve ingredients:
   - Map step.ingredients if present
   - Only include if array has items (same pattern as timers)

3. Verify the IStep interface in src/db/types/index.ts includes ingredients

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] RecipeDetail now includes step-level ingredients

Output:
- Files modified: src/lib/recipes/loader.ts
```

---

### Phase 1: Responsive Layout Foundation

**Dependencies**: Phase 0

**Deliverables**:
- [x] `src/components/recipes/recipe-content-layout.tsx`
- [x] Update recipe detail page to use new layout

**Agent Prompt**:
```
Context:
- Read: work/PR-033/requirements.md, work/PR-033/design.md
- Reference: src/app/(main)/recipes/[slug]/page.tsx
- Note: This project uses Tailwind v4 (CSS-first, no tailwind.config.ts)

Task:
1. Create src/components/recipes/recipe-content-layout.tsx:
   - Accept ingredientPanel and instructionsPanel as children
   - Use Tailwind v4 arbitrary variants for landscape:
     className="flex flex-col gap-8 [@media(orientation:landscape)_and_(min-height:480px)]:grid [@media(orientation:landscape)_and_(min-height:480px)]:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)] [@media(orientation:landscape)_and_(min-height:480px)]:gap-6 [@media(orientation:landscape)_and_(min-height:480px)]:h-screen [@media(orientation:landscape)_and_(min-height:480px)]:overflow-hidden"
   - Each column gets overflow-y-auto in landscape

2. Update src/app/(main)/recipes/[slug]/page.tsx:
   - Wrap ingredients section and instructions section in RecipeContentLayout
   - Keep header and footer outside the layout

3. Test manually by rotating device/using responsive mode

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Layout switches between 1-col and 2-col based on orientation
- [ ] Both columns scroll independently in landscape

Output:
- Files created: src/components/recipes/recipe-content-layout.tsx
- Files modified: src/app/(main)/recipes/[slug]/page.tsx
```

---

### Phase 2: Lift Multiplier State

**Dependencies**: Phase 1

**Deliverables**:
- [x] `src/components/recipes/recipe-detail-client.tsx`
- [x] Modified `src/components/recipes/scalable-ingredient-list.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-033/design.md (State Management section)
- Reference: src/components/recipes/scalable-ingredient-list.tsx

Task:
1. Create src/components/recipes/recipe-detail-client.tsx:
   - Client component that wraps recipe content
   - Manages multiplier state (useState with default 1)
   - Provides multiplier and setMultiplier to children via props or context

2. Modify ScalableIngredientList to accept optional external multiplier:
   - Add props: `multiplier?: number`, `onMultiplierChange?: (n: number) => void`
   - If external multiplier provided, use it (controlled mode)
   - If not provided, use internal state (uncontrolled mode, backward compatible)

3. Update recipe detail page:
   - Wrap content in RecipeDetailClient
   - Pass multiplier down to ScalableIngredientList

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Multiplier controls still work
- [ ] Changing multiplier updates ingredient quantities

Output:
- Files created: src/components/recipes/recipe-detail-client.tsx
- Files modified: src/components/recipes/scalable-ingredient-list.tsx, page.tsx
```

---

### Phase 3: Interactive Step List

**Dependencies**: Phase 2

**Deliverables**:
- [x] `src/components/recipes/interactive-step-list.tsx`
- [x] `src/components/recipes/ingredient-tooltip.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-033/design.md (InteractiveStepList, IngredientTooltip sections)
- Reference: src/components/recipes/step-list.tsx, src/db/types/index.ts (IStep)

Task:
1. Create src/components/recipes/ingredient-tooltip.tsx:
   - Simple tooltip component showing formatted ingredient
   - Accept: ingredient, multiplier, isOpen, onClose
   - Position above the trigger element
   - Style: bg-card, shadow, rounded, border

2. Create src/components/recipes/interactive-step-list.tsx:
   - Similar structure to step-list.tsx
   - Accept additional props: ingredients (full list), multiplier
   - Parse step text to find ingredient names from step.ingredients
   - Wrap matching words in IngredientTrigger buttons
   - Manage activeIngredient state locally
   - On tap: show tooltip with scaled quantity
   - On outside click: close tooltip

3. Update recipe-detail-client.tsx:
   - Use InteractiveStepList instead of StepList
   - Pass multiplier and full ingredients list

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Ingredient names in steps are underlined/styled
- [ ] Tapping shows tooltip with measurement
- [ ] Tooltip shows scaled quantity when multiplier changed
- [ ] Tapping outside closes tooltip

Output:
- Files created: interactive-step-list.tsx, ingredient-tooltip.tsx
- Files modified: recipe-detail-client.tsx
```

---

### Phase 4: Polish & Edge Cases

**Dependencies**: Phase 3

**Deliverables**:
- [ ] Handle edge cases (no ingredients in step, long ingredient names)
- [ ] Accessibility improvements
- [ ] Animation/transitions

**Agent Prompt**:
```
Context:
- Read: work/PR-033/requirements.md (acceptance criteria)
- Test the implementation from Phases 1-3

Task:
1. Edge cases:
   - Steps with no ingredients: render as plain text (no triggers)
   - Ingredient name appears multiple times in same step: each is tappable
   - Very long ingredient names: tooltip doesn't overflow viewport

2. Accessibility:
   - Tooltip has role="tooltip" and aria-describedby
   - Ingredient triggers are buttons with aria-expanded
   - Focus management: close tooltip on Escape key
   - Screen reader: "1 cup flour" announced when tooltip opens

3. Visual polish:
   - Smooth tooltip appear/disappear (opacity transition)
   - Subtle highlight on active ingredient trigger
   - Proper z-index layering

4. Test on actual device or good emulator:
   - iPhone landscape
   - iPad landscape
   - Android tablet

Verification:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Keyboard navigation works (Tab to ingredient, Enter to open)
- [ ] VoiceOver/TalkBack announces tooltip content
- [ ] No visual glitches on orientation change

Output:
- Files modified: interactive-step-list.tsx, ingredient-tooltip.tsx
```

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 0 ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (BLOCKER FIX)
Phase 1 ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 ░░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░
Phase 4 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░
─────────────────────────────────────────────────────────────
```

Phases are sequential - each builds on the previous. Phase 0 must complete first (data model blocker).

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Portrait layout | Single column, ingredients then steps | | [ ] Pass [ ] Fail |
| Landscape layout | Two columns side by side | | [ ] Pass [ ] Fail |
| Orientation switch | Layout adapts smoothly | | [ ] Pass [ ] Fail |
| Multiplier in landscape | Updates both panels | | [ ] Pass [ ] Fail |
| Tap ingredient in step | Tooltip shows measurement | | [ ] Pass [ ] Fail |
| Tap outside tooltip | Tooltip closes | | [ ] Pass [ ] Fail |
| Scaled tooltip | Shows adjusted quantity | | [ ] Pass [ ] Fail |
| Keyboard navigation | Can tab to ingredients | | [ ] Pass [ ] Fail |

### Device Testing

| Device | Orientation | Status |
|--------|-------------|--------|
| iPhone 14 Pro | Portrait | [ ] Pass |
| iPhone 14 Pro | Landscape | [ ] Pass |
| iPad | Landscape | [ ] Pass |
| Chrome DevTools (mobile) | Both | [ ] Pass |

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables registered in `scripts/deliverables.yaml`
- [ ] `npm run lint` - All files pass Biome
- [ ] `npm run typecheck` - No TypeScript errors
- [ ] `python scripts/progress.py` - PR shows complete

### Quality Checks
- [ ] Thai-lint passes
- [ ] No TODO comments left in code
- [ ] No console.log statements
- [ ] Documentation updated

### Integration Checks
- [ ] Feature works in dev environment
- [ ] No regression in existing features
- [ ] Mobile responsive (tested at 375px portrait, 667px landscape)

---

## Session Log

### Session 1 - 2026-02-04
- Completed Phase 0: Data Model Fix
- Updated `RecipeDetail.steps` to include `ingredients` array
- Updated `convertStepsForDetail()` to preserve step ingredients
- Lint and typecheck pass

### Session 2 - 2026-02-04
- Completed Phases 1-4: Full implementation
- Created `recipe-content-layout.tsx` - responsive grid with Tailwind v4 arbitrary variants
- Created `recipe-detail-client.tsx` - client wrapper with shared multiplier state
- Modified `scalable-ingredient-list.tsx` - supports controlled/uncontrolled modes
- Created `interactive-step-list.tsx` - parses steps and wraps ingredients in triggers
- Created `ingredient-tooltip.tsx` - shows scaled ingredient measurements
- Updated recipe detail page to use new components
- All lint and typecheck pass

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-033/` directory
- [ ] Update `docs/` if needed
- [ ] Remove any debug code
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
