# PR-045: Recipe Tile Styling Consistency - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-21
> **Author**: Cursor Agent

---

## Overview

Align RecipeGrid (filtered list) layout with RecipeSection (curated rows) standards: fixed minimum card width (16rem / 256px), uniform gap (gap-4), and improved scroll UX for horizontal sections.

---

## Architecture

### Current State

| Component | Layout | Card width | Gap | Issue |
|-----------|--------|------------|-----|-------|
| RecipeSection | Flex row, overflow-x-auto | Fixed w-64 (256px) | gap-4 | Reference standard |
| RecipeGrid | CSS Grid, breakpoint columns | Fluid (fills cell) | gap-6 | Inconsistent dimensions |

### Target State

| Component | Layout | Card width | Gap |
|-----------|--------|------------|-----|
| RecipeSection | Unchanged + scroll hint | w-64 (256px) | gap-4 |
| RecipeGrid | Auto-fill grid, min 16rem | minmax(16rem, 1fr) | gap-4 |

---

## Implementation

### 1. RecipeGrid (`src/components/recipes/recipe-grid.tsx`)

**Change**: Replace breakpoint-based grid with auto-fill grid and align gap.

```tsx
// Before
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// After (matches RecipeSection w-64 / 16rem standard)
<div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
```

- `16rem` = 256px = same as RecipeSection `w-64`
- `auto-fill` + `minmax` ensures consistent min card width across breakpoints
- `gap-4` matches RecipeSection

### 2. RecipeSection (`src/components/recipes/recipe-section.tsx`)

**Change**: Add right-edge padding and optional fade mask to hint scrollability (per PR-044 design).

- Add `pr-4` to scroll container for breathing room when scrolled to end
- Add `mask-image: linear-gradient(to right, black 95%, transparent 100%)` via inline style or Tailwind arbitrary value to hint that content continues

Note: The mask fades the right edge of visible content when more exists. Alternative: skip mask if it causes accessibility or visual issues; padding alone may suffice.

---

## File Structure

```
src/components/recipes/
├── recipe-grid.tsx     # Modify: grid classes
└── recipe-section.tsx  # Modify: padding, optional mask
```

---

## Verification

- `npm run lint` passes
- `npm run typecheck` passes
- Manual: Visit /recipes, compare Random tiles vs filtered list tiles — same width/gap feel
- Manual: Horizontal scroll section — no harsh truncation, scroll hint or padding visible
