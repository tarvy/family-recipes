# PR-037: Recipe Editor & Detail UX Improvements - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-02-05
> **Author**: Claude Code

---

## Overview

Four independent UX improvements targeting the recipe detail page and editor. Each change is minimal and focused: a date utility, z-index constant, auto-grow effect, and flexbox chain.

---

## Architecture

### Component Design

```
src/lib/format/date.ts (NEW)
  └── formatUpdatedDate() -- locale-aware date formatting

src/lib/recipes/repository.ts
  └── RecipeDetail.updatedAt?: string -- ISO string, not Date (RSC boundary)
  └── toRecipeDetail() -- maps doc.updatedAt to ISO string

src/lib/recipes/loader.ts
  └── RecipeDetail.updatedAt?: string -- always undefined for file-based

src/app/(main)/recipes/[slug]/page.tsx
  └── Meta row: CalendarIcon + "Updated Jan 5, 2026"
  └── Footer: "Last updated: Jan 5, 2026"

src/lib/constants/navigation.ts
  └── Z_INDEX_EDITOR_SAVE_BAR = 58 (between panel=55 and searchModal=60)

src/components/recipes/recipe-editor-form.tsx
  └── useCookingSession() for hasCookingContent
  └── pb-20 on form when cooking panel has content
  └── z-index on sticky save bar
  └── flex flex-col on editor wrapper

src/components/recipes/cooklang-editor.tsx
  └── useEffect auto-grow on value change
  └── MIN_HEIGHT_PX = 288 replaces MIN_ROWS = 12
  └── flex-1 on textarea for column matching
```

### Data Flow

```
MongoDB doc.updatedAt (Date) → toRecipeDetail() → ISO string → page.tsx → formatUpdatedDate() → "Jan 5, 2026"
```

---

## Key Design Decisions

### 1. updatedAt as ISO string (not Date)

Date objects cannot cross the React Server Component serialization boundary. The field is typed as `string` (ISO 8601) in the `RecipeDetail` interface and serialized via `toISOString()` in `toRecipeDetail()`.

### 2. Z-index 58 for editor save bar

The z-index stack is: header(40) < overlay(45) < drawer(50) < cookingPanel(55) < **editorSaveBar(58)** < searchModal(60). This ensures the save bar sits above the cooking panel but below the search modal.

### 3. Auto-grow via useEffect on value

The effect resets height to `auto` (to measure natural content height), reads `scrollHeight`, and applies `Math.max(scrollHeight, MIN_HEIGHT_PX)`. This fires on every `value` change. Manual `resize-y` is preserved.

### 4. Column height via CSS flexbox chain

CSS Grid's default `align-items: stretch` makes both columns equal height. The left column uses `flex flex-col`, CooklangEditor gets `flex-1`, and the textarea inside also gets `flex-1`, creating a chain that fills the available height.

---

## Database Changes

None. `updatedAt` already exists on Mongoose documents (timestamps option).

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CalendarIcon` | `page.tsx` (inline) | SVG calendar icon for updated date display |

### Modified Components

| Component | Change |
|-----------|--------|
| `RecipeEditorForm` | Imports cooking session, adds padding/z-index, flex column |
| `CooklangEditor` | Auto-grow effect, min-height style, flex-1 |

---

## File Structure

```
src/
├── lib/
│   ├── format/
│   │   └── date.ts (NEW)
│   ├── recipes/
│   │   ├── repository.ts (MODIFIED)
│   │   └── loader.ts (MODIFIED)
│   └── constants/
│       └── navigation.ts (MODIFIED)
├── app/
│   └── (main)/recipes/[slug]/
│       └── page.tsx (MODIFIED)
└── components/
    └── recipes/
        ├── recipe-editor-form.tsx (MODIFIED)
        └── cooklang-editor.tsx (MODIFIED)
```

---

## Dependencies

### New Packages

None.

### Internal Dependencies

- `src/lib/format/date.ts` → used by `page.tsx`
- `src/components/cooking-session` → used by `recipe-editor-form.tsx`
- `src/lib/constants/navigation.ts` → used by `recipe-editor-form.tsx`

---

## Security Considerations

- [x] No user input involved (updatedAt comes from MongoDB)
- [x] No new API endpoints
- [x] No sensitive data exposure

---

## Observability

No new logging required. Existing recipe loading traces cover the data flow.

---

## Testing Strategy

### Manual Verification

| Check | Expected |
|-------|----------|
| DB recipe detail page | Shows "Updated" date in meta row and footer |
| File-based recipe detail page | No updated date shown |
| Editor with cooking panel | Save button visible above panel |
| Editor without cooking panel | Normal layout, no extra padding |
| Textarea auto-grow | Grows with content, min 288px |
| Textarea manual resize | resize-y still works |
| Desktop column heights | Editor fills to match preview |
| Mobile layout | Single column, unaffected |

---

## Alternatives Considered

### Auto-grow: ResizeObserver vs useEffect

- **ResizeObserver**: More performant for external resize events
- **useEffect on value** (Selected): Simpler, handles the primary use case (content change), and resize-y covers manual adjustment
- **Why selected**: Minimal complexity, covers all practical scenarios
