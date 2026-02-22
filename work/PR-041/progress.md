# PR-041: Recipe Quantity Fraction Display - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-02-21
> **Target**: 2026-02-21
> **Branch**: `feat/fraction-display-imperial`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | |
| Design | [x] Draft [ ] Review [ ] Approved | |
| Implementation | [ ] Not Started [ ] In Progress [x] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | |
| Documentation | [ ] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

From `scripts/deliverables.yaml`:

- [x] `src/lib/shopping/aggregator.ts` - Add formatQuantityForDisplay, FRACTION_UNITS, scaleAndFormatQuantity
- [x] `src/components/recipes/scalable-ingredient-list.tsx` - Use unit-aware formatting
- [x] `src/components/recipes/ingredient-tooltip.tsx` - Use unit-aware formatting

---

## Implementation Phases

### Phase 1: Core Formatting in Aggregator

**Dependencies**: None (can start immediately)

**Deliverables**:
- [x] `src/lib/shopping/aggregator.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-041/requirements.md, work/PR-041/design.md
- Reference: src/lib/shopping/aggregator.ts (formatAmount, parseQuantity, normalizeUnit)

Task:
1. Add FRACTION_UNITS: Set of normalized units that use fraction notation: 'teaspoon', 'tablespoon', 'cup'
2. Add formatAmountDecimal(amount: number): string — for non-fraction units: integers as-is, decimals with toFixed(2), strip trailing zeros (e.g. 1.50 → "1.5")
3. Add formatQuantityForDisplay(amount: number, unit?: string | null): string
   - If unit (after normalizeUnit) is in FRACTION_UNITS: return formatAmount(amount)
   - Else: return formatAmountDecimal(amount)
4. Add scaleAndFormatQuantity(quantity: string | undefined, unit: string | undefined, multiplier: number): string
   - If !quantity: return ''
   - Parse with parseQuantity(quantity)
   - If parse fails: return quantity as-is (fallback)
   - scaledAmount = parsed.amount * multiplier
   - Return formatQuantityForDisplay(scaledAmount, unit ?? parsed.unit)
5. Export formatQuantityForDisplay and scaleAndFormatQuantity

Verification:
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] No changes to existing formatAmount, parseQuantity, combineQuantities (shopping list can keep using formatAmount without unit for now)
```

---

### Phase 2: Integrate in Recipe Display Components

**Dependencies**: Phase 1

**Deliverables**:
- [x] `src/components/recipes/scalable-ingredient-list.tsx`
- [x] `src/components/recipes/ingredient-tooltip.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-041/requirements.md, work/PR-041/design.md
- Reference: src/components/recipes/scalable-ingredient-list.tsx, src/components/recipes/ingredient-tooltip.tsx
- Use: scaleAndFormatQuantity from @/lib/shopping/aggregator

Task:
1. In scalable-ingredient-list.tsx:
   - Replace scaleQuantity with scaleAndFormatQuantity
   - Update formatIngredient to pass ingredient.unit: scaleAndFormatQuantity(ingredient.quantity, ingredient.unit, multiplier)
   - Remove local scaleQuantity; import scaleAndFormatQuantity from aggregator
   - Handle case where scaleAndFormatQuantity returns '' — only push to parts if non-empty
2. In ingredient-tooltip.tsx:
   - Same changes: use scaleAndFormatQuantity(ingredient.quantity, ingredient.unit, multiplier)
   - Remove local scaleQuantity; import from aggregator

Verification:
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] Manual: View Pudding Mix Chocolate Chip Cookies — 0.25 cup shows as ¼ cup, 0.5 tsp as ½ tsp
- [ ] Manual: Scale 2× — 0.5 cup flour becomes 1 cup
- [ ] Manual: Click ingredient in step — tooltip matches list
```

---

## Test Plan

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| 0.25 cup at 1× | ¼ cup | [ ] |
| 0.5 tsp at 1× | ½ tsp | [ ] |
| 0.75 cup at 1× | ¾ cup | [ ] |
| 0.5 cup at 2× | 1 cup | [ ] |
| 250 g | 250 g (decimal) | [ ] |
| Tooltip consistency | Matches list | [ ] |

### Run Commands

```bash
npm run lint:fix && npm run lint && npm run typecheck
```

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables registered in scripts/deliverables.yaml
- [ ] npm run lint — All files pass Biome
- [ ] npm run typecheck — No TypeScript errors
- [ ] python scripts/progress.py — PR shows complete

### Quality Checks
- [ ] Thai-lint passes (run locally if needed)
- [ ] No TODO comments left in code
- [ ] No console.log (use logger if needed)

### Integration Checks
- [ ] Recipe page displays fractions for tsp/tbsp/cup
- [ ] Metric (g, ml) unchanged
- [ ] Scaling works correctly

---

## Session Log

### Session 1 - 2026-02-21

**Agent**: Cursor
**Duration**: Setup

**Completed**:
- [x] requirements.md
- [x] design.md
- [x] progress.md
- [x] deliverables.yaml entry
- [x] Phase 1: Core formatting in aggregator.ts
- [x] Phase 2: Component integration

**Implementation Summary**:
- Added FRACTION_UNITS, formatAmountDecimal, formatQuantityForDisplay, scaleAndFormatQuantity to aggregator
- scalable-ingredient-list and ingredient-tooltip now use scaleAndFormatQuantity with unit for fraction display
- npm run lint, typecheck pass
