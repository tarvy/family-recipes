# PR-011: Recipe UI - List & Search - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-27
> **Author**: Claude Code

---

## Overview

Build a recipe browsing interface with category filtering and text search. Uses Next.js App Router with React Server Components for initial data loading, client components for interactivity.

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│  /recipes page                                              │
│  ├── Server: Load all recipes from filesystem               │
│  └── Client: Filter/search in-memory                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  recipes/ directory (84 .cook files)                        │
│  ├── entrees/     (53 recipes)                              │
│  ├── desserts/    (17 recipes)                              │
│  ├── soups/       (6 recipes)                               │
│  ├── sides/       (6 recipes)                               │
│  ├── salads/      (1 recipe)                                │
│  └── breakfast/   (1 recipe)                                │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

```
RecipesPage (Server Component)
├── Load recipes from filesystem at build/request time
├── Pass to client boundary
└── RecipeBrowser (Client Component)
    ├── RecipeFilters
    │   ├── Search input (debounced)
    │   └── Category pills/buttons
    └── RecipeGrid
        └── RecipeCard[] (filtered list)
```

### Data Flow

```
1. Request /recipes?category=entrees&q=chicken
2. Server: Read all .cook files, parse metadata
3. Server: Pass recipe list to client component
4. Client: Filter by category (from URL param)
5. Client: Filter by search query (from URL param)
6. Client: Render filtered RecipeGrid
7. User: Changes filter → URL updates → re-filter
```

---

## Database Changes

**None** - This PR reads directly from filesystem. Database sync happens in PR-009.

For initial implementation, we read from filesystem at request time. This is acceptable for 84 recipes but should be optimized later (static generation, caching, or database reads).

---

## API Design

**No new API routes for this PR** - Data is loaded server-side from filesystem.

Future optimization (out of scope):
- `GET /api/recipes` - List recipes with filters
- `GET /api/recipes/search?q=chicken` - Text search

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RecipeCard` | `src/components/recipes/recipe-card.tsx` | Display single recipe preview |
| `RecipeGrid` | `src/components/recipes/recipe-grid.tsx` | Responsive grid of RecipeCards |
| `RecipeFilters` | `src/components/recipes/recipe-filters.tsx` | Search input + category filters |
| `RecipeBrowser` | `src/components/recipes/recipe-browser.tsx` | Client wrapper combining filters + grid |

### Component Hierarchy

```
src/app/(main)/recipes/page.tsx (Server)
└── RecipeBrowser (Client - "use client")
    ├── RecipeFilters
    │   ├── <input> search box
    │   └── <button> category pills
    └── RecipeGrid
        └── RecipeCard (× n)
            ├── Title
            ├── Category badge
            ├── Time info
            └── Link to /recipes/[slug]
```

### State Management

- **URL State**: Category filter and search query stored in URL params (`?category=entrees&q=chicken`)
- **React State**: None persistent - derived from URL on each render
- **No external state library** - React + URL is sufficient

### URL Structure

```
/recipes                        → All recipes
/recipes?category=entrees       → Filtered to entrees
/recipes?q=chicken              → Search for "chicken"
/recipes?category=soups&q=beef  → Combined filter + search
```

Use `nuqs` or `useSearchParams` for URL state management.

---

## File Structure

```
src/
├── app/
│   └── (main)/
│       └── recipes/
│           └── page.tsx          ← Server component, loads data
├── components/
│   └── recipes/
│       ├── recipe-card.tsx       ← Single recipe card
│       ├── recipe-grid.tsx       ← Grid layout
│       ├── recipe-filters.tsx    ← Search + category filter
│       ├── recipe-browser.tsx    ← Client wrapper (optional)
│       └── index.ts              ← Re-exports
└── lib/
    └── recipes/
        └── loader.ts             ← Filesystem recipe loading
```

---

## Dependencies

### New Packages

None required. Using:
- Built-in Next.js App Router features
- Existing `@cooklang/cooklang-ts` for parsing
- Tailwind CSS for styling

### Internal Dependencies

- `src/lib/cooklang/parser.ts` - Parse .cook file content
- `src/lib/git-recipes/file-scanner.ts` - May reuse for finding .cook files

---

## Recipe Card Design

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │     [Placeholder Image]   │  │
│  │     or Category Icon      │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Recipe Title                   │
│  ─────────────────────────────  │
│  🏷️ Entrees                     │
│  ⏱️ 30 min prep · 45 min cook   │
│                                 │
└─────────────────────────────────┘
```

### Card States

- **Default**: Normal appearance
- **Hover**: Slight scale + shadow
- **Focus**: Visible focus ring (accessibility)

---

## Filter Component Design

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 [Search recipes...                              ]       │
│                                                             │
│  ○ All  ● Entrees  ○ Desserts  ○ Soups  ○ Sides  ○ More... │
└─────────────────────────────────────────────────────────────┘
```

### Filter Behavior

1. **Search**: Debounced 300ms, updates URL
2. **Category**: Click to toggle, single-select, updates URL
3. **Combined**: Both filters AND together
4. **Clear**: "All" button or clear search resets

---

## Security Considerations

- [x] Input validation: Search query sanitized (no SQL/NoSQL injection risk - client-side filter)
- [x] No authentication required for browsing
- [x] No sensitive data exposed (recipes are public to authenticated users)
- [x] XSS prevention: React auto-escapes content

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Recipe load | debug | { count, duration } |
| Filter applied | debug | { category, query, resultCount } |

### Traces

| Span | Attributes |
|------|------------|
| `recipes.load` | recipe_count, load_duration_ms |
| `recipes.filter` | category, query, result_count |

---

## Testing Strategy

### Manual Verification (PR-017 will add test harness)

| Check | Expected | Status |
|-------|----------|--------|
| Page loads with all 84 recipes | Grid shows 84 cards | [ ] |
| Category filter works | Clicking "Entrees" shows 53 | [ ] |
| Search works | Searching "chicken" finds matches | [ ] |
| Mobile layout | Single column at 375px | [ ] |
| URL state | Filters persist in URL | [ ] |
| Navigation | Clicking card goes to detail (404 OK for now) | [ ] |

---

## Rollout Plan

1. [x] Implement components
2. [ ] Manual verification in dev
3. [ ] Build passes
4. [ ] Merge to main
5. [ ] Verify on preview deployment

---

## Alternatives Considered

### Option A: Database-first (Rejected)

- **Pros**: Faster queries, proper search index
- **Cons**: Requires DB sync to be complete, more complexity
- **Why rejected**: DB sync (PR-009) may not be fully wired up. Filesystem works for 84 recipes.

### Option B: Static generation (Deferred)

- **Pros**: Zero runtime overhead, fastest possible
- **Cons**: Need to regenerate on recipe changes
- **Why deferred**: Can optimize later. SSR is fast enough for now.

### Option C: Filesystem read (Selected)

- **Pros**: Simple, works immediately, no DB dependency
- **Cons**: Slightly slower than static/cached
- **Why selected**: Pragmatic for current scale, can optimize later.

---

## Open Design Questions

- [x] Use `nuqs` for URL state or plain `useSearchParams`? → **Plain useSearchParams** (no new deps)
- [ ] Placeholder image strategy for cards? → **Category-based colored backgrounds initially**
