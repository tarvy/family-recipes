# PR-046: Recipe Rating & Cook Log - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-02-21

---

## Overview

Add family-wide recipe rating (1-5 stars) and cook log tracking directly on the Recipe document. Two new API endpoints, two new UI components, and schema/repository updates.

---

## Data Model

Embed on Recipe document (family-wide, not per-user):

```typescript
// On IRecipe:
rating?: number;        // 1-5 stars, undefined if unrated
cookLog?: Array<{
  cookedAt: Date;
  note?: string;
}>;
```

Schema additions in `recipe.model.ts`:
- `cookLogEntrySchema` sub-schema with `_id: true` for unique entries
- `rating: { type: Number, min: 1, max: 5 }`
- `cookLog: { type: [cookLogEntrySchema], default: [] }`

---

## API Endpoints

### POST /api/recipes/[slug]/rate

- Body: `{ rating: number }` (1-5) or `{ rating: null }` to clear
- Auth: any logged-in user
- Calls `rateRecipe()` repository function

### POST /api/recipes/[slug]/cook-log

- Body: `{ note?: string }`
- Auth: any logged-in user
- Calls `addCookLogEntry()` repository function

Both follow existing patterns: `withRequestContext`, `withTrace`, `getSessionFromCookies`.

---

## Repository Functions

```typescript
export async function rateRecipe(slug: string, rating: number | null): Promise<boolean>
export async function addCookLogEntry(slug: string, note?: string): Promise<boolean>
```

Update `RecipeDetail` interface and `toRecipeDetail()` to include rating and cookLog.

---

## UI Components

### `star-rating.tsx` (client)
- 5 star SVGs, filled/empty based on current rating
- Hover preview, click to set, click same to clear
- Props: `rating`, `onRate`, `disabled`

### `recipe-interactions.tsx` (client)
- Star rating row
- "I Cooked This!" button with inline note form
- Cook log list with dates and notes
- Summary line: "Cooked N times - Last on date"

---

## File Structure

| File | Change |
|------|--------|
| `src/db/types/index.ts` | Add `rating`, `cookLog` to `IRecipe` |
| `src/db/models/recipe.model.ts` | Add schema fields |
| `src/lib/recipes/repository.ts` | Add functions, update `RecipeDetail` |
| `src/app/api/recipes/[slug]/rate/route.ts` | NEW |
| `src/app/api/recipes/[slug]/cook-log/route.ts` | NEW |
| `src/components/recipes/star-rating.tsx` | NEW |
| `src/components/recipes/recipe-interactions.tsx` | NEW |
| `src/app/(main)/recipes/[slug]/page.tsx` | Render RecipeInteractions |
