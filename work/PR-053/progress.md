# PR-053: Planner Page UI + Drag-and-Drop - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-03-11
> **Target**: TBD
> **Branch**: `feat/053-planner-page-dnd`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | 7 user stories with Gherkin criteria |
| Design | [x] Approved | Component tree, drag system, state strategy |
| Phase 1: Foundation | [ ] Not Started | Server page + client root + drag context |
| Phase 2: Source panel | [ ] Not Started | Tabs, search, scroll, draggable cards |
| Phase 3: Calendar grid | [ ] Not Started | Day rows, meal slots, drop targets |
| Phase 4: Card fan + overlay | [ ] Not Started | Fanned stacks, carousel |
| Phase 5: Actions + polish | [ ] Not Started | Status buttons, week switcher, nav link |
| Verification | [ ] Not Started | Lint, typecheck, manual testing |

---

## Deliverables Checklist

- [ ] `src/app/(main)/menu/page.tsx` - Server component: auth + data loading
- [ ] `src/components/menu/planner-page.tsx` - Client root with state machine
- [ ] `src/components/menu/drag-context.tsx` - React context for drag coordination
- [ ] `src/components/menu/use-planner-drag.ts` - Pointer capture drag hook
- [ ] `src/components/menu/use-drop-target.ts` - Hit detection + 700ms hover hook
- [ ] `src/components/menu/recipe-source-panel.tsx` - Source section container
- [ ] `src/components/menu/recipe-source-tabs.tsx` - Recipe Book / Discovery toggle
- [ ] `src/components/menu/recipe-search.tsx` - Debounced search input
- [ ] `src/components/menu/recipe-scroll.tsx` - Horizontal snap scroll
- [ ] `src/components/menu/draggable-recipe-card.tsx` - Mini card with drag initiation
- [ ] `src/components/menu/calendar-grid.tsx` - 7 day rows container
- [ ] `src/components/menu/day-row.tsx` - Single day: drop target + expansion
- [ ] `src/components/menu/meal-slot.tsx` - Breakfast/Lunch/Dinner column
- [ ] `src/components/menu/card-fan.tsx` - SW-to-NE fanned stack
- [ ] `src/components/menu/card-fan-overlay.tsx` - Full-screen carousel overlay
- [ ] `src/components/menu/planner-actions.tsx` - Status-driven action buttons
- [ ] `src/components/menu/status-badge.tsx` - Status indicator pill
- [ ] `src/components/menu/week-switcher.tsx` - This Week / Next Week tabs
- [ ] `src/lib/menu/fuzzy-search.ts` - Client-side includes filter
- [ ] `src/components/navigation/header.tsx` - MODIFIED: add /menu nav link

---

## Implementation Phases

### Phase 1: Foundation (Server Page + Client Root + Drag System)

**Dependencies**: PR-052 merged (API endpoints available)

**Deliverables**:
- [ ] `src/app/(main)/menu/page.tsx`
- [ ] `src/components/menu/planner-page.tsx`
- [ ] `src/components/menu/drag-context.tsx`
- [ ] `src/components/menu/use-planner-drag.ts`
- [ ] `src/components/menu/use-drop-target.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-053/requirements.md, work/PR-053/design.md
- Read: docs/ARCHITECTURE.md for project patterns
- Read: src/app/(main)/recipes/page.tsx for server component pattern reference
- This is a meal planning page at /menu, behind auth

Task:
1. Create src/app/(main)/menu/page.tsx as a server component:
   - Import getSessionFromCookies for auth
   - Redirect to /auth/signin if no session
   - Fetch current week's WeeklyMenu from the API (or create one if none exists)
   - Pass serialized menu data + recipe list to PlannerPage client component

2. Create src/components/menu/planner-page.tsx as the client root:
   - Accept menu data and recipes as props
   - Wrap children in DragContext.Provider
   - Manage top-level state: activeWeek, menuData per week
   - Restore ephemeral state from sessionStorage on mount (activeTab, searchQuery, scrollLeft)
   - Save ephemeral state to sessionStorage on change
   - Render placeholder slots for: WeekSwitcher, StatusBadge, RecipeSourcePanel, CalendarGrid, PlannerActions
   - Use "use client" directive

3. Create src/components/menu/drag-context.tsx:
   - Define DragState interface: { isDragging, draggedRecipe, ghostPosition, expandedDay, expandedSlot }
   - Create React context with DragContextProvider
   - Export useDragContext hook
   - Provider manages state updates for drag lifecycle

4. Create src/components/menu/use-planner-drag.ts:
   - Custom hook that attaches to a draggable element ref
   - On pointerdown: call setPointerCapture, clone element as ghost
   - Ghost: position:fixed, pointer-events:none, z-index:9999, transform:scale(0.75)
   - On pointermove: update ghost position with clientX/clientY
   - On pointerup: determine drop target via DragContext, fire onDrop callback, remove ghost
   - Clean up listeners on unmount

5. Create src/components/menu/use-drop-target.ts:
   - Custom hook for DayRow elements
   - Register element bounding rect on mount, recalculate on window resize
   - Expose isOver state based on current drag position hit-testing
   - Manage 700ms timer: start on pointer enter, clear on leave
   - When timer fires: set expandedDay in DragContext
   - On drop: identify target slot (default "dinner" if not expanded), call onDrop
   - Collapse expanded row after drop (immediate) or pointer leave (300ms delay)

Verification:
- npm run typecheck passes
- npm run lint passes
- /menu page renders (even if mostly placeholder content)
- DragContext provider mounts without errors

Output:
- Files created: menu/page.tsx, planner-page.tsx, drag-context.tsx, use-planner-drag.ts, use-drop-target.ts
```

---

### Phase 2: Recipe Source Panel

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/components/menu/recipe-source-panel.tsx`
- [ ] `src/components/menu/recipe-source-tabs.tsx`
- [ ] `src/components/menu/recipe-search.tsx`
- [ ] `src/components/menu/recipe-scroll.tsx`
- [ ] `src/components/menu/draggable-recipe-card.tsx`
- [ ] `src/lib/menu/fuzzy-search.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-053/design.md (Recipe Source Panel section, Component Hierarchy)
- Read: src/components/menu/planner-page.tsx (integrate into this component)
- Read: src/components/menu/drag-context.tsx (draggable cards need this)
- The source panel sits at the top of the planner page, above the calendar grid

Task:
1. Create src/lib/menu/fuzzy-search.ts:
   - Export function fuzzySearch(items, query, key): filters items where item[key] includes query
   - Case-insensitive comparison
   - Empty query returns all items
   - Use string.toLowerCase().includes() -- simple substring matching, not a library

2. Create src/components/menu/recipe-source-tabs.tsx:
   - Two-tab toggle: "Recipe Book" and "Discovery"
   - Accept activeTab and onTabChange props
   - Style: pill-shaped toggle, active tab gets bg-pink
   - "use client"

3. Create src/components/menu/recipe-search.tsx:
   - Debounced text input (300ms debounce)
   - Accept value, onChange props
   - Clear button when text is present
   - Placeholder: "Search recipes..."
   - "use client"

4. Create src/components/menu/draggable-recipe-card.tsx:
   - Mini card showing recipe thumbnail + truncated title
   - Use usePlannerDrag hook to make it draggable
   - On pointerdown: initiate drag via the hook
   - Card size: roughly 120x90px (responsive)
   - Touch-action: none (prevent scroll during drag)
   - "use client"

5. Create src/components/menu/recipe-scroll.tsx:
   - Horizontal scrollable container with CSS scroll-snap
   - Renders DraggableRecipeCard for each recipe
   - scroll-snap-type: x mandatory
   - Overflow-x: auto, hide scrollbar on mobile
   - Accept recipes array as prop
   - "use client"

6. Create src/components/menu/recipe-source-panel.tsx:
   - Container that composes RecipeSourceTabs, RecipeSearch, RecipeScroll
   - Filters recipes using fuzzySearch based on search query
   - Filters by tab (Recipe Book = user's recipes, Discovery = all/suggested)
   - Accept recipes, activeTab, searchQuery, onTabChange, onSearchChange props
   - "use client"

7. Wire RecipeSourcePanel into PlannerPage:
   - Replace the source panel placeholder with the real component
   - Connect tab/search state from PlannerPage to the panel
   - Verify sessionStorage persistence for tab and search

Verification:
- npm run typecheck passes
- npm run lint passes
- Source panel renders with tabs, search, and scrollable recipe cards
- Typing in search filters visible cards
- Tab toggle switches recipe source

Output:
- Files created: fuzzy-search.ts, recipe-source-tabs.tsx, recipe-search.tsx,
  recipe-scroll.tsx, draggable-recipe-card.tsx, recipe-source-panel.tsx
- Files modified: planner-page.tsx
```

---

### Phase 3: Calendar Grid + Drop Targets

**Dependencies**: Phase 1 (drag system), Phase 2 (source panel provides drag sources)

**Deliverables**:
- [ ] `src/components/menu/calendar-grid.tsx`
- [ ] `src/components/menu/day-row.tsx`
- [ ] `src/components/menu/meal-slot.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-053/design.md (Calendar Grid, Drag-and-Drop, 700ms expansion)
- Read: src/components/menu/use-drop-target.ts (day rows are drop targets)
- Read: src/components/menu/drag-context.tsx (expansion state lives here)
- The calendar grid is the bottom half of the planner page, showing 7 day rows

Task:
1. Create src/components/menu/calendar-grid.tsx:
   - Renders 7 DayRow components (Sunday through Saturday)
   - Accept assignments prop: Map<day, Assignment[]> from the WeeklyMenu
   - Accept onAssign callback (called when a recipe is dropped)
   - Accept onRemove callback (called when an assignment is removed)
   - Vertical stack layout, each row separated by a subtle border
   - "use client"

2. Create src/components/menu/day-row.tsx:
   - Single day row: label on the left, assigned recipes on the right
   - Use useDropTarget hook to register as a drop target
   - Default (not expanded): show assigned recipes in a horizontal line (or CardFan if multiple per slot)
   - Expanded (700ms hover during drag): split into 3 MealSlot columns
   - Visual feedback when a dragged card is hovering: subtle bg highlight
   - Day label: abbreviated day name (Sun, Mon, etc.)
   - When expanded, animate width transition (CSS transition on grid-template-columns)
   - "use client"

3. Create src/components/menu/meal-slot.tsx:
   - Single column within an expanded DayRow
   - Label: "Breakfast", "Lunch", or "Dinner"
   - Shows assigned recipes for that specific slot
   - Acts as a finer-grained drop target (slot-level)
   - Accepts slot type and assignments for that slot as props
   - Empty state: dashed border placeholder
   - "use client"

4. Wire CalendarGrid into PlannerPage:
   - Replace calendar placeholder with real CalendarGrid
   - Connect onAssign to POST /api/weekly-menu/[id]/assign
   - Connect onRemove to DELETE /api/weekly-menu/[id]/assign/[assignId]
   - Optimistic UI: update local state immediately, revert on API failure

5. Test the full drag flow end-to-end:
   - Drag a card from the source panel to a day row
   - Verify the assignment API is called
   - Verify the card appears in the day row
   - Verify 700ms hover expands to meal slots
   - Verify dropping on a meal slot assigns to that specific slot

Verification:
- npm run typecheck passes
- npm run lint passes
- Calendar grid renders 7 day rows
- Drag-and-drop creates assignments
- 700ms hover triggers slot expansion
- Drop without hover assigns to dinner by default

Output:
- Files created: calendar-grid.tsx, day-row.tsx, meal-slot.tsx
- Files modified: planner-page.tsx
```

---

### Phase 4: Card Fan + Carousel Overlay

**Dependencies**: Phase 3 (day rows need to render fanned stacks)

**Deliverables**:
- [ ] `src/components/menu/card-fan.tsx`
- [ ] `src/components/menu/card-fan-overlay.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-053/design.md (Card Fan Layout, Carousel Overlay sections)
- Read: src/components/menu/day-row.tsx (fans render inside day rows)
- Multiple recipes in a single slot fan from bottom-left to top-right

Task:
1. Create src/components/menu/card-fan.tsx:
   - Renders a stack of mini recipe cards with CSS transforms
   - Each card offset: translate(N*12px, N*-8px) rotate(N*2deg)
   - Newest card (last in array) has highest z-index, sits on top
   - Single card: no transform, renders normally
   - Accept recipes array and onTap callback
   - On tap: if 2+ cards, call onTap to open overlay; if 1 card, navigate to recipe
   - Cards show recipe thumbnail and truncated title
   - Container sized to fit the fanned spread
   - "use client"

2. Create src/components/menu/card-fan-overlay.tsx:
   - Full-screen overlay triggered by tapping a fanned stack
   - Backdrop: fixed position, bg-black/50, backdrop-blur-sm
   - Content: horizontal carousel with CSS scroll-snap (scroll-snap-type: x mandatory)
   - Each slide: larger recipe card with image, title, time info, servings
   - Swipe horizontally between cards
   - Dismiss: tap backdrop (outside cards) or swipe down
   - Swipe-down detection: track pointerdown/pointermove Y delta, dismiss if > 100px
   - Animate in: fade backdrop + slide up content
   - Animate out: fade backdrop + slide down content
   - Trap focus inside overlay for accessibility
   - "use client"

3. Integrate CardFan into DayRow:
   - When a slot has 2+ assignments, render CardFan instead of individual cards
   - When a slot has 1 assignment, render a single card (tappable to navigate)
   - Wire onTap to open CardFanOverlay with the slot's recipes

4. Add CardFanOverlay to PlannerPage:
   - Render at the PlannerPage level (needs to cover the whole viewport)
   - Manage overlay state: isOpen, recipes to display
   - Pass close handler to overlay

Verification:
- npm run typecheck passes
- npm run lint passes
- 1 card in slot: renders flat, tap navigates
- 2 cards: fan visible with offset
- 3+ cards: progressive fan, tap opens overlay
- Overlay: horizontal swipe between cards
- Overlay dismisses on backdrop tap and swipe-down

Output:
- Files created: card-fan.tsx, card-fan-overlay.tsx
- Files modified: day-row.tsx, planner-page.tsx
```

---

### Phase 5: Actions, Week Switcher, Status Badge, Nav Link

**Dependencies**: Phase 3 (calendar grid must exist for actions to make sense)

**Deliverables**:
- [ ] `src/components/menu/planner-actions.tsx`
- [ ] `src/components/menu/status-badge.tsx`
- [ ] `src/components/menu/week-switcher.tsx`
- [ ] `src/components/navigation/header.tsx` (MODIFIED)

**Agent Prompt**:
```
Context:
- Read: work/PR-053/design.md (Status-driven actions, Week switcher)
- Read: src/components/navigation/header.tsx (add /menu link)
- Read: work/PR-053/requirements.md (Story 5 and Story 6 acceptance criteria)
- Actions change based on menu status; week switcher loads independent data per week

Task:
1. Create src/components/menu/status-badge.tsx:
   - Small pill/badge showing current menu status
   - Three states with distinct colors:
     "building" → yellow bg, dark text
     "survey-sent" → lavender bg, dark text
     "locked-in" → pink bg, dark text (or green for finalized feel)
   - Accept status prop as a string
   - "use client"

2. Create src/components/menu/week-switcher.tsx:
   - Two-tab toggle: "This Week" and "Next Week"
   - Accept activeWeek ("current" | "next") and onSwitch callback
   - Style: similar to recipe source tabs, pill toggle
   - Each tab shows the week's date range (e.g., "Mar 9 - 15")
   - "use client"

3. Create src/components/menu/planner-actions.tsx:
   - Renders different buttons based on menu status:
     "building": [Send Survey] button (primary, pink bg)
     "survey-sent": [Cancel Survey] (secondary) + [Finalize] (primary)
     "locked-in": [Unlock & Edit] button (secondary/warning)
   - Each button calls the PATCH /api/weekly-menu/[id]/status endpoint
   - Show loading state during API call
   - Confirm before destructive actions (Cancel Survey, Unlock)
   - Accept status, menuId, onStatusChange props
   - "use client"

4. Wire into PlannerPage:
   - Replace remaining placeholders with WeekSwitcher, StatusBadge, PlannerActions
   - WeekSwitcher: on switch, fetch the other week's menu data
   - StatusBadge: reads from current week's menu status
   - PlannerActions: on status change, update local state + refetch

5. Modify src/components/navigation/header.tsx:
   - Add a "Menu" or "Planner" nav link pointing to /menu
   - Place it alongside existing nav items
   - Match the existing link styling pattern

Verification:
- npm run typecheck passes
- npm run lint passes
- Status badge shows correct state for each menu status
- Week switcher loads different data per tab
- Action buttons match the status (building → Send Survey, etc.)
- /menu appears in the navigation header
- Button clicks trigger correct API calls

Output:
- Files created: planner-actions.tsx, status-badge.tsx, week-switcher.tsx
- Files modified: header.tsx, planner-page.tsx
```

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 1 ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 ░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 ░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  ← parallel with Phase 2 after Phase 1
Phase 4 ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░  ← needs Phase 3
Phase 5 ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░  ← parallel with Phase 4 after Phase 3
─────────────────────────────────────────────────────────────

Parallel Opportunities:
- Phase 2 + Phase 3 can run in parallel after Phase 1 (source panel and calendar grid are independent)
- Phase 4 + Phase 5 can run in parallel after Phase 3 (card fan and actions are independent)
```

### Stream A: Source Panel (Phase 2)
Can run in parallel with Stream B after Phase 1 completes. No dependency on calendar grid.

### Stream B: Calendar Grid (Phase 3)
Can run in parallel with Stream A after Phase 1 completes. No dependency on source panel.

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| /menu loads with auth | Page renders for family members | | [ ] Pass [ ] Fail |
| Drag card to day row | Assignment created (dinner default) | | [ ] Pass [ ] Fail |
| 700ms hover during drag | Day row expands to 3 meal columns | | [ ] Pass [ ] Fail |
| Drop on specific meal slot | Correct slot assignment | | [ ] Pass [ ] Fail |
| Card fan with 3 recipes | SW-to-NE offset pattern | | [ ] Pass [ ] Fail |
| Tap fanned stack | Carousel overlay opens | | [ ] Pass [ ] Fail |
| Tap outside overlay | Overlay dismisses | | [ ] Pass [ ] Fail |
| Navigate to recipe and back | Tab, search, scroll preserved | | [ ] Pass [ ] Fail |
| Week switcher | Independent data per week | | [ ] Pass [ ] Fail |
| Building status actions | "Send Survey" button shown | | [ ] Pass [ ] Fail |
| Survey-sent status actions | "Cancel Survey" + "Finalize" | | [ ] Pass [ ] Fail |
| Locked-in status actions | "Unlock & Edit" button | | [ ] Pass [ ] Fail |
| Mobile 375px | All features accessible via touch | | [ ] Pass [ ] Fail |
| /menu in navigation | Link appears in header | | [ ] Pass [ ] Fail |

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables registered in `scripts/deliverables.yaml`
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `python scripts/progress.py` shows PR complete

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] All components use "use client" where needed
- [ ] sessionStorage keys namespaced to avoid collisions

### Integration Checks
- [ ] Feature works in dev environment
- [ ] No regression in existing features
- [ ] Mobile responsive (tested at 375px)
- [ ] Drag works on both touch and mouse

---

## Session Log

(No sessions yet)

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-053/` directory
- [ ] Update permanent docs (`docs/*.md`) with planner page documentation
- [ ] Remove any debug code or test data
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
