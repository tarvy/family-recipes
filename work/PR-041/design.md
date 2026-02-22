# PR-041: Recipe Quantity Fraction Display - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-21
> **Author**: Cursor Agent

---

## Overview

Add a unit-aware formatting layer that converts decimal amounts to Unicode vulgar fractions (¼, ½, ¾, etc.) for imperial volume units (teaspoon, tablespoon, cup) while keeping metric units as decimals. The fix requires always formatting display quantities—including at 1× scale—instead of passing raw quantity strings through unchanged.

---

## Architecture

### Current Data Flow (Problem)

```
Cooklang @flour{0.5%cup}
    ↓
IIngredient { quantity: "0.5", unit: "cup" }
    ↓
scaleQuantity(quantity, multiplier)
    ├─ multiplier === 1 → return quantity (raw "0.5")  ← BUG: no formatting
    └─ multiplier !== 1 → parseQuantity → formatAmount(amount) → "½"
    ↓
Display: "0.5 cup flour" (at 1×) vs "½ cup flour" (at 2×)
```

### Target Data Flow

```
IIngredient { quantity: "0.5", unit: "cup" }
    ↓
scaleAndFormatQuantity(quantity, unit, multiplier)
    ├─ parseQuantity(quantity) → { amount: 0.5, unit: "cup" }
    ├─ scaledAmount = amount * multiplier
    └─ formatQuantityForDisplay(scaledAmount, unit) → "½" (for cup) or "0.5" (for g)
    ↓
Display: "½ cup flour" (consistent at all scales)
```

### Component Design

```
formatQuantityForDisplay(amount, unit?)
    ├─ isFractionUnit(unit) → formatAmount(amount)  [¼ ½ ¾ etc.]
    └─ else → formatAmountDecimal(amount)           [0.5, 1.25, etc.]

scaleAndFormatQuantity(quantity, unit, multiplier)
    ├─ parseQuantity(quantity)
    ├─ scaledAmount = amount * multiplier
    └─ formatQuantityForDisplay(scaledAmount, unit)

Consumers:
    - ScalableIngredientList.formatIngredient()
    - IngredientTooltip.formatIngredientForTooltip()
```

---

## Data Flow

1. **Parsing**: Cooklang parser produces `IIngredient { quantity, unit }`. Quantity may be `"0.25"`, `"1/2"`, `"½"`, etc. Unit comes from Cooklang or parseQuantity when quantity embeds unit (e.g. `"0.5 cup"`).
2. **Normalization**: Use `normalizeUnit()` from aggregator so `tsp`, `teaspoons`, `tablespoon` all map to canonical forms.
3. **Formatting decision**: If normalized unit is in `FRACTION_UNITS` (teaspoon, tablespoon, cup), use `formatAmount()` (existing, converts to fractions). Otherwise use decimal formatting.
4. **Display**: Both ingredients list and tooltip use the same `scaleAndFormatQuantity` helper.

---

## File Structure

```
src/lib/shopping/
    aggregator.ts          # Add formatQuantityForDisplay, FRACTION_UNITS, scaleAndFormatQuantity (or update formatAmount)

src/components/recipes/
    scalable-ingredient-list.tsx   # Use new formatting with unit
    ingredient-tooltip.tsx         # Use new formatting with unit
```

---

## Implementation Details

### FRACTION_UNITS

```typescript
/** Imperial volume units that use fraction notation (¼ ½ ¾) instead of decimals */
const FRACTION_UNITS = new Set([
  'teaspoon',    // tsp, teaspoons
  'tablespoon',  // tbsp, tbs, tablespoons
  'cup',         // c, cups
]);
```

### formatQuantityForDisplay

```typescript
/**
 * Format a numeric amount for recipe display.
 * Uses Unicode fractions (¼ ½ ¾) for imperial volume units; decimals for metric/other.
 */
export function formatQuantityForDisplay(amount: number, unit?: string | null): string
```

- If `unit` (normalized) is in `FRACTION_UNITS`: call existing `formatAmount(amount)`.
- Otherwise: `formatAmountDecimal(amount)` — integers as-is, decimals with `toFixed(2)` or similar, strip trailing zeros.

### scaleAndFormatQuantity

New helper or refactor of `scaleQuantity` to:
- Accept `(quantity: string, unit: string | undefined, multiplier: number)`.
- Always parse, scale, and format (never return raw quantity string).
- Return formatted string from `formatQuantityForDisplay(scaledAmount, unit)`.

### Edge Cases

| Case | Behavior |
|------|----------|
| quantity parse fails | Return original `quantity` string |
| unit undefined | Use decimal format |
| amount is integer | "2" (no fraction) |
| amount has fractional part, metric unit | "125.5" or "125.5 g" |
| Mixed number (1.5) | "1½" for fraction units, "1.5" for metric |

---

## Database Changes

None.

---

## API Design

No API changes. Display-only.

---

## Dependencies

### Internal

- `src/lib/shopping/aggregator.ts` — parseQuantity, formatAmount, normalizeUnit
- No new packages

---

## Security Considerations

- Display-only formatting. No user input stored. No new attack surface.
- Fraction symbols (¼, ½) are display strings; no injection risk.

---

## Observability

No new logging required. Pure formatting.

---

## Testing Strategy

### Manual Verification

| Recipe | Check |
|--------|-------|
| Pudding Mix Chocolate Chip Cookies | 0.25 cup → ¼ cup, 0.5 tsp → ½ tsp, 0.75 cup → ¾ cup |
| Recipe with metric | 250 g, 125 ml remain decimal |
| Scale 2× | 0.5 cup × 2 → 1 cup |

### Unit Tests (if present)

- `formatQuantityForDisplay(0.25, 'cup')` → `"¼"`
- `formatQuantityForDisplay(0.5, 'teaspoon')` → `"½"`
- `formatQuantityForDisplay(250, 'gram')` → `"250"`
- `formatQuantityForDisplay(125.5, 'milliliter')` → `"125.5"`

---

## Alternatives Considered

### Option A: Format at parse/sync time
- **Pros**: Single source of formatted value.
- **Cons**: Cooklang source stores decimals; we'd need to track "display format" separately. Scaling would require parsing again.
- **Why rejected**: Display concern, not storage. Scaling requires numeric amount.

### Option B: Unit-aware formatAmount (Selected)
- **Pros**: Single formatting function, unit parameter optional. Backward compatible for callers that don't pass unit (e.g. shopping list).
- **Cons**: Need to update call sites to pass unit.
- **Why selected**: Minimal change, clear separation of fraction vs decimal by unit.

### Option C: CSS/Unicode-only
- **Pros**: No logic change.
- **Cons**: Can't convert 0.25 → ¼ with CSS. Need JS.
- **Why rejected**: Not feasible.
