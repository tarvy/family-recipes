# PR-044: Recipe List Sections - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-21
> **Author**: Cursor Agent, Claude Code

---

## Overview

Add curated recipe sections (Most Used, Recently Used, Recently Added, Random) to the main recipes page. Each section is a horizontally scrollable row of 4–8 recipe cards. Section data is loaded via **one loader call** that returns all sections (Option A). New Recipe model fields `useCount` and `lastUsedAt` support usage-based sections; usage is recorded when the recipe detail page loads.

---

## Architecture

### System Context

```
Recipes Page (/recipes)
├── getRecipeSections()   → single loader, returns all 4 sections
├── RecipeSections        → receives sections data, renders rows
│   └── RecipeSection     × 4 (one per non-empty section)
└── RecipeBrowser        (existing: filters + grid)
```

One async call loads all section data. The page passes it to `RecipeSections`, which renders a `RecipeSection` for each non-empty section.

### Data Flow

```
Page load
  → Recipes page calls getRecipeSections()
  → Loader runs 4 queries (or batched logic) in one function
  → Returns { mostUsed, recentlyUsed, recentlyAdded, random }
  → RecipeSections receives data, renders RecipeSection for each with recipes
  → Empty sections omitted from DOM
  → Recipe detail view
  → recordRecipeUse(slug) called (fire-and-forget)
  → Recipe.updateOne({ slug }, { $inc: { useCount: 1 }, $set: { lastUsedAt: now } })
```

---

## Database Changes

### Schema Modifications

| Table | Change | Migration Required |
|-------|--------|-------------------|
| recipes | Add `useCount: Number`, default 0 | No (default handles existing docs) |
| recipes | Add `lastUsedAt: Date` | No |

### New Fields (Recipe model)

```typescript
useCount: { type: Number, default: 0 }
lastUsedAt: { type: Date }
```

### Indexes

```javascript
recipeSchema.index({ useCount: -1 });
recipeSchema.index({ lastUsedAt: -1 });
recipeSchema.index({ createdAt: -1 });
```

All three indexes are required. `createdAt` is populated by Mongoose `timestamps: true` but still needs an explicit index for the `recentlyAdded` sort query.

---

## Loader API (Option A: Single Loader)

One function returns all sections.

### `getRecipeSections(limit?: number): Promise<RecipeSectionsData>`

```typescript
interface RecipeSectionsData {
  mostUsed: RecipePreview[];
  recentlyUsed: RecipePreview[];
  recentlyAdded: RecipePreview[];
  random: RecipePreview[];
}
```

Implementation (in `src/lib/recipes/loader.ts`):
1. **mostUsed**: `Recipe.find({ useCount: { $gt: 0 } }).sort({ useCount: -1 }).limit(limit).exec()` → map to RecipePreview
2. **recentlyUsed**: `Recipe.find({ lastUsedAt: { $ne: null } }).sort({ lastUsedAt: -1 }).limit(limit).exec()` → map to RecipePreview
3. **recentlyAdded**: `Recipe.find().sort({ createdAt: -1 }).limit(limit).exec()` → map to RecipePreview
4. **random**: `Recipe.aggregate([{ $sample: { size: limit } }])` → map to RecipePreview

Use `$sample` instead of loading all recipes — O(1) vs O(n). Run all 4 queries via `Promise.all`. Default limit: 6.

---

## Usage Recording

### When
- On recipe detail page load: `loadRecipeDetail(slug)` succeeds
- Or: when `GET /api/recipes/[slug]` returns recipe (if client fetches)

**Recommended**: Call `recordRecipeUse(slug)` inside `loadRecipeDetail()` or the detail page, after we confirm the recipe exists. Fire-and-forget (`void recordRecipeUse(slug)`) so it does not block rendering.

### Implementation
- New function: `recordRecipeUse(slug: string): Promise<void>` in repository
- Uses time-based dedup to prevent inflated counts from rapid page loads/refreshes:
  ```typescript
  const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  Recipe.updateOne(
    { slug, $or: [{ lastUsedAt: null }, { lastUsedAt: { $lt: cutoff } }] },
    { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } }
  )
  ```
- If the recipe was viewed within the last 5 minutes, the update is a no-op (filter doesn't match)
- Log on success/failure for observability
- Location: `src/lib/recipes/repository.ts`

### Future: Per-User Tracking
Note: `useCount`/`lastUsedAt` on the Recipe model tracks family-wide usage. Per-user "Recently Used" would eventually use `IRecipeHistory` (already in the schema) instead. This is intentionally out of scope for PR-044.

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RecipeSection` | `src/components/recipes/recipe-section.tsx` | One section: title + horizontally scrollable row of RecipeCards |
| `RecipeSections` | `src/components/recipes/recipe-sections.tsx` | Receives `RecipeSectionsData` + `canDelete`, maps to RecipeSection for each non-empty section |

### RecipeSection (server component — no `"use client"`)

- Props: `title: string`, `recipes: RecipePreview[]`, `canDelete: boolean`
- Layout: Section header (h2) + horizontal scroll container
- Mobile: `overflow-x-auto`, `flex`, `gap-4`, `snap-x snap-mandatory`, `pb-2`
- Cards must have **fixed width** (`w-64 flex-shrink-0`) for horizontal scroll to work
- Right edge fade gradient (`mask-image: linear-gradient(...)`) to hint scrollability
- Cards: Reuse `RecipeCard`

### RecipeSections (server component — no `"use client"`)

- Props: `sections: RecipeSectionsData`, `canDelete: boolean`
- For each non-empty section (mostUsed, recentlyUsed, recentlyAdded, random), render `<RecipeSection title="..." recipes={...} canDelete={...} />`
- Order: Most Used, Recently Used, Recently Added, Random

### Component Model Note
Both `RecipeSection` and `RecipeSections` are server components (they receive data as props from the server page). `RecipeCard` is already a client component (it uses `useRouter`, long-press), so it renders as a client island within the server component tree.

### Component Hierarchy

```
RecipesPage (async)
├── sections = await getRecipeSections()
└── MainLayout
    └── div (max-w-6xl)
        ├── header (title + count)
        ├── RecipeSections sections={sections} canDelete={canDelete}
        │   └── RecipeSection × N (one per non-empty section)
        └── RecipeBrowser (existing: filters + grid)
```

---

## Constants

```typescript
// src/lib/recipes/constants.ts or inline
const SECTION_RECIPE_LIMIT_MIN = 4;
const SECTION_RECIPE_LIMIT_MAX = 8;
const SECTION_RECIPE_LIMIT_DEFAULT = 6;
```

---

## File Structure

```
src/
├── app/(main)/recipes/
│   └── page.tsx                    # Call getRecipeSections(), pass to RecipeSections
├── components/recipes/
│   ├── recipe-section.tsx         # NEW: horizontal scroll section row
│   └── recipe-sections.tsx        # NEW: receives sections data, renders RecipeSection for each
├── db/
│   └── models/recipe.model.ts     # Add useCount, lastUsedAt, indexes
├── db/types/index.ts              # Add useCount, lastUsedAt to IRecipe
└── lib/recipes/
    ├── loader.ts                  # Add getRecipeSections()
    └── repository.ts              # Add recordRecipeUse
```

---

## Page Layout

Sections appear **above** the existing filters and grid. Order:
1. Page header
2. Recipe sections (Most Used, Recently Used, Recently Added, Random)
3. Recipe filters + full grid (existing)

---

## Security & Observability

### Security
- No new auth: recipe detail is already public
- `recordRecipeUse` is an internal write; no user input beyond slug (validated)

### Logging
- `recordRecipeUse`: log at debug on success
- Section loaders: use existing `withTrace` and `logger.recipes`

### Traces
- `repository.recordRecipeUse`
- `recipes.getRecipeSections`

---

## Alternatives Considered

### Option A: Single loader returning all sections (Selected)
- **Pros**: One call, simpler code, easier to maintain
- **Cons**: Slightly more server work before first byte
- **Why selected**: Keep things simple until we need another pattern

### Option B: Separate server components per section
- **Pros**: Parallel loading, streaming
- **Cons**: More components, multiple loaders, more complexity
- **Why rejected**: Unnecessary complexity for current scale
