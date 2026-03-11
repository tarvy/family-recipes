# PR-053: Planner Page UI + Drag-and-Drop - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-03-11
> **Author**: Claude Code (Sisyphus)

---

## Overview

Build the `/menu` planner page as a single-page experience for weekly meal planning. The page combines a scrollable recipe source panel with a 7-day calendar grid, connected by custom Pointer Events drag-and-drop. Recipes fan into SW-to-NE stacks when multiple land in one slot. A carousel overlay provides detail browsing. All persistent state lives in MongoDB (fetched on load); ephemeral UI state (active tab, search query, scroll position) persists via sessionStorage.

---

## Architecture

### System Context

```
/menu (authenticated, inside (main) layout)
  │
  ├── Server: MenuPage
  │     └── auth check + fetch current week's WeeklyMenu from MongoDB
  │
  └── Client: PlannerPage
        ├── DragContext (React context for cross-component drag coordination)
        ├── Recipe source panel (tabs, search, horizontal scroll)
        ├── Calendar grid (7 day rows, expandable meal slots)
        ├── Drag ghost (position:fixed overlay during drag)
        └── Planner actions (status-driven buttons)
```

### Component Hierarchy

```
<MenuPage>                              ← Server component
└── <PlannerPage>                       ← Client root, state machine
    ├── <DragContext.Provider>
    │   ├── <WeekSwitcher />            ← "This Week" / "Next Week"
    │   ├── <StatusBadge />             ← building / survey-sent / locked-in
    │   ├── <RecipeSourcePanel>
    │   │   ├── <RecipeSourceTabs />    ← "Recipe Book" / "Discovery"
    │   │   ├── <RecipeSearch />        ← Debounced fuzzy search input
    │   │   └── <RecipeScroll>          ← Horizontal snap scroll
    │   │       └── <DraggableRecipeCard /> ×N
    │   ├── <CalendarGrid>
    │   │   └── <DayRow /> ×7
    │   │       ├── <CardFan />         ← SW-to-NE fanned stack (default)
    │   │       └── <MealSlot /> ×3     ← Breakfast|Lunch|Dinner (700ms hover)
    │   └── <PlannerActions />          ← Send Survey / Cancel / Finalize / Unlock
    └── <DragGhost />                   ← position:fixed, pointer-events:none
```

### Data Flow

```
Page Load:
  Server: auth → fetchWeeklyMenu(currentWeek) → serialize props
  Client: hydrate → restore sessionStorage (tab, search, scroll)
            → render source panel + calendar grid

Drag Flow:
  pointerdown on DraggableRecipeCard
    → setPointerCapture (locks events to element)
    → clone ghost node (position:fixed, 75% scale, z-index:9999)
  pointermove
    → update ghost position (clientX, clientY)
    → hit-test against DayRow boundaries
    → if hovering DayRow > 700ms → expand to MealSlots
  pointerup
    → determine target (DayRow → dinner, MealSlot → specific slot)
    → POST /api/weekly-menu/[id]/assign
    → optimistic UI update → confirm on API success
    → collapse expanded row, remove ghost

Week Switch:
  tap "Next Week" → fetch next week's WeeklyMenu
    → swap calendar grid data
    → status badge + actions update
    → source panel stays unchanged
```

---

## Database Changes

None. PR-052 provides the WeeklyMenu model with assignments, status, and voting fields. This PR only reads and writes through existing API endpoints.

---

## API Usage

This PR creates no new API endpoints. It consumes endpoints from PR-052:

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/api/weekly-menu` | GET | Load current/next week menu |
| `/api/weekly-menu` | POST | Create new menu if none exists |
| `/api/weekly-menu/[id]/assign` | POST | Assign recipe to day + slot |
| `/api/weekly-menu/[id]/assign/[assignId]` | DELETE | Remove assignment |
| `/api/weekly-menu/[id]/status` | PATCH | Transition status |
| `/api/recipes` | GET | Load recipes for source panel |

---

## UI Components

### New Components (19 files)

| Component | File | Purpose |
|-----------|------|---------|
| `MenuPage` | `src/app/(main)/menu/page.tsx` | Server component: auth, data loading |
| `PlannerPage` | `src/components/menu/planner-page.tsx` | Client root: state machine, providers |
| `DragContext` | `src/components/menu/drag-context.tsx` | React context for drag state |
| `usePlannerDrag` | `src/components/menu/use-planner-drag.ts` | Pointer capture + ghost management |
| `useDropTarget` | `src/components/menu/use-drop-target.ts` | Hit detection + 700ms hover timer |
| `RecipeSourcePanel` | `src/components/menu/recipe-source-panel.tsx` | Top section container |
| `RecipeSourceTabs` | `src/components/menu/recipe-source-tabs.tsx` | Recipe Book / Discovery toggle |
| `RecipeSearch` | `src/components/menu/recipe-search.tsx` | Debounced input with clear button |
| `RecipeScroll` | `src/components/menu/recipe-scroll.tsx` | Horizontal scroll with snap points |
| `DraggableRecipeCard` | `src/components/menu/draggable-recipe-card.tsx` | Mini card, pointerdown initiates drag |
| `CalendarGrid` | `src/components/menu/calendar-grid.tsx` | 7 day rows container |
| `DayRow` | `src/components/menu/day-row.tsx` | Single day: drop target, expansion |
| `MealSlot` | `src/components/menu/meal-slot.tsx` | Breakfast/Lunch/Dinner column |
| `CardFan` | `src/components/menu/card-fan.tsx` | SW-to-NE fanned stack |
| `CardFanOverlay` | `src/components/menu/card-fan-overlay.tsx` | Full-screen carousel overlay |
| `PlannerActions` | `src/components/menu/planner-actions.tsx` | Status-driven action buttons |
| `StatusBadge` | `src/components/menu/status-badge.tsx` | Status indicator pill |
| `WeekSwitcher` | `src/components/menu/week-switcher.tsx` | This Week / Next Week tabs |
| `fuzzySearch` | `src/lib/menu/fuzzy-search.ts` | Client-side includes-based filter |

### Modified Files (1 file)

| File | Change |
|------|--------|
| `src/components/navigation/header.tsx` | Add /menu nav link |

### Drag-and-Drop Implementation

Custom Pointer Events approach, no external library. Three core pieces:

**usePlannerDrag hook:**
```
- Attaches pointerdown listener to draggable elements
- Calls setPointerCapture() to lock pointer stream to element
- Creates ghost: cloneNode → position:fixed, pointer-events:none, z-index:9999
- Scales ghost to 75% via CSS transform
- Tracks pointermove → updates ghost translate(clientX, clientY)
- On pointerup → fires onDrop callback with target info, removes ghost
```

**useDropTarget hook:**
```
- Registers DayRow bounding rects on mount (recalculates on resize)
- During drag: hit-tests pointer position against registered rects
- Starts 700ms timer when pointer enters a DayRow
- Timer fires → sets expandedDay state → row renders MealSlot columns
- On pointer leave → clears timer, collapses after 300ms delay
- On drop → identifies target slot, collapses immediately
```

**DragContext:**
```
- Shared state: isDragging, draggedRecipe, ghostPosition, expandedDay
- Provider wraps PlannerPage
- Consumers: DraggableRecipeCard (source), DayRow (target), DragGhost (display)
```

### Card Fan Layout

CSS transforms on stacked cards within a slot:

```
Card 0 (bottom): transform: none
Card 1: transform: translate(12px, -8px) rotate(2deg)
Card 2: transform: translate(24px, -16px) rotate(4deg)
Card N: transform: translate(N*12px, N*-8px) rotate(N*2deg)
```

Newest card has highest z-index and sits on top. Tap target covers the visible portion of the top card plus the exposed edges of cards beneath.

### Carousel Overlay

Triggered by tapping a fanned stack (2+ cards). Renders a full-screen overlay with:
- Backdrop: `bg-black/50`, `backdrop-blur-sm`
- Centered horizontal carousel with snap scroll
- Swipe-down or tap-outside to dismiss
- Each slide shows a larger recipe card with title, image, time info

### State Management

| State Type | Storage | Restored On |
|------------|---------|-------------|
| Menu assignments | MongoDB (via API) | Page load (server fetch) |
| Menu status | MongoDB (via API) | Page load (server fetch) |
| Vote results | MongoDB (via API) | Page load (server fetch) |
| Active source tab | sessionStorage | Client hydration |
| Search query | sessionStorage | Client hydration |
| Scroll position | sessionStorage | Client hydration |
| Drag state | React context (memory) | Not restored (ephemeral) |

---

## File Structure

```
src/
├── app/
│   └── (main)/
│       └── menu/
│           └── page.tsx                    # NEW: Server component
├── components/
│   ├── menu/
│   │   ├── planner-page.tsx               # NEW: Client root
│   │   ├── drag-context.tsx               # NEW: Drag state context
│   │   ├── use-planner-drag.ts            # NEW: Drag hook
│   │   ├── use-drop-target.ts             # NEW: Drop target hook
│   │   ├── recipe-source-panel.tsx        # NEW: Source container
│   │   ├── recipe-source-tabs.tsx         # NEW: Tab toggle
│   │   ├── recipe-search.tsx              # NEW: Search input
│   │   ├── recipe-scroll.tsx              # NEW: Horizontal scroll
│   │   ├── draggable-recipe-card.tsx      # NEW: Draggable card
│   │   ├── calendar-grid.tsx              # NEW: Day rows container
│   │   ├── day-row.tsx                    # NEW: Single day row
│   │   ├── meal-slot.tsx                  # NEW: Meal column
│   │   ├── card-fan.tsx                   # NEW: Fanned stack
│   │   ├── card-fan-overlay.tsx           # NEW: Carousel overlay
│   │   ├── planner-actions.tsx            # NEW: Action buttons
│   │   ├── status-badge.tsx               # NEW: Status pill
│   │   └── week-switcher.tsx              # NEW: Week tabs
│   └── navigation/
│       └── header.tsx                     # MODIFIED: Add /menu link
└── lib/
    └── menu/
        └── fuzzy-search.ts                # NEW: Client-side filter
```

---

## Dependencies

### New Packages

None. The drag-and-drop system uses native Pointer Events. Carousel uses CSS scroll snap. No external libraries needed.

### Internal Dependencies

- PR-052's API endpoints (must be merged first)
- Existing auth system (`getSessionFromCookies`)
- Existing recipe data model
- Existing design tokens (pink/lavender/yellow/cocoa/cream)

---

## Security Considerations

- [x] Page is behind `(main)` layout auth (family members only)
- [x] All mutations go through PR-052's guarded API endpoints
- [x] No user input rendered as HTML (recipe names via text content only)
- [x] Ghost element uses pointer-events:none (can't intercept clicks)
- [x] sessionStorage scoped to origin (no cross-site leakage)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Menu page loaded | info | `{ weekNumber, menuId, assignmentCount }` |
| Recipe assigned via drag | info | `{ menuId, recipeSlug, day, slot }` |
| Assignment removed | info | `{ menuId, assignmentId }` |
| Status transition | info | `{ menuId, from, to }` |
| Drag cancelled (no target) | debug | `{ recipeSlug }` |

### Traces

| Span | Attributes |
|------|------------|
| `menu.page.load` | `weekNumber`, `menuStatus` |
| `menu.assign` | `recipeSlug`, `day`, `slot` |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `fuzzy-search.ts` | Substring matching, case insensitivity, empty input |
| `drag-context.tsx` | Context value updates, provider rendering |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Drag-and-drop assignment | pointerdown → pointermove → pointerup creates assignment |
| 700ms hover expansion | Timer fires, slots render, collapse on leave |
| Card fan rendering | Correct transforms for 1, 2, 3+ cards |

### Manual Verification

| Check | Expected |
|-------|----------|
| Drag from source to day row | Assignment created, card appears |
| Hold 700ms over day row during drag | Row expands to 3 meal columns |
| Tap fanned stack | Carousel overlay opens |
| Navigate to recipe and back | Tab, search, scroll preserved |
| Week switcher | Each week loads independently |
| Mobile at 375px | All interactions work via touch |
| `npm run lint` | Zero errors |
| `npm run typecheck` | Zero errors |

---

## Alternatives Considered

### Option A: @dnd-kit library
- **Pros**: Mature accessibility support, sensor system
- **Cons**: 30KB+ bundle, doesn't match existing codebase patterns, complex setup for custom hover-expansion behavior
- **Why rejected**: Existing app uses custom pointer event hooks; consistency matters more than library features we won't use

### Option B: HTML5 Drag API
- **Pros**: Native, zero bundle cost
- **Cons**: No touch support, limited ghost customization, inconsistent across browsers, can't do 700ms hover expansion
- **Why rejected**: Doesn't work on mobile at all

### Option C: Custom Pointer Events (Selected)
- **Pros**: Touch + mouse unified, full ghost control, matches existing hooks pattern, supports hover timer logic natively
- **Cons**: More code to write
- **Why selected**: Best fit for the specific UX requirements (700ms expansion, custom ghost, mobile support)

---

## Open Design Questions

- [x] None remaining
