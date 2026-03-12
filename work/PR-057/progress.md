# PR-057: Menu Publish Flow & Calendar-Style Menu Navigation - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-03-12
> **Target**: TBD
> **Branch**: `feat/057-publish-flow`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft | Updated with append-to-list and calendar nav |
| Design | [x] Draft | Updated with append-to-list and calendar nav |
| Implementation | [ ] Not Started | |
| Testing | [ ] Not Started | |
| Documentation | [ ] Not Started | |
| Cleanup | [ ] Not Started | |

---

## Deliverables Checklist

- [ ] `src/db/types/index.ts` - Add `published` status, new vote interface
- [ ] `src/db/models/weekly-menu.model.ts` - Update status enum, vote schema, new index
- [ ] `src/lib/menu/repository.ts` - Add findPublishedByWeek, vote queries
- [ ] `src/lib/menu/service.ts` - publishMenu, unpublishMenu, toggleVote, sendToShoppingList
- [ ] `src/lib/shopping/service.ts` - appendItemsToList function
- [ ] `src/app/api/menu/[id]/publish/route.ts` - Publish/unpublish endpoints
- [ ] `src/app/api/menu/[id]/vote/route.ts` - Vote toggle endpoint
- [ ] `src/app/api/menu/[id]/shopping-list/route.ts` - Append to shopping list endpoint
- [ ] `src/app/api/menu/family/route.ts` - List family published menus for a week
- [ ] `src/components/menu/planner-actions.tsx` - Publish/Unpublish/Send to List buttons
- [ ] `src/components/menu/status-badge.tsx` - Published status config
- [ ] `src/components/menu/week-switcher.tsx` - Calendar-style prev/next navigation
- [ ] `src/components/menu/planner-page.tsx` - Family section, past-week read-only mode
- [ ] `src/components/menu/calendar-grid.tsx` - readOnly prop
- [ ] `src/components/menu/family-menu-section.tsx` - Other users' published menus
- [ ] `src/components/menu/family-menu-card.tsx` - Expandable family menu card
- [ ] `src/components/menu/vote-button.tsx` - Per-assignment vote toggle
- [ ] `src/app/(main)/menu/page.tsx` - Updated to support week query param + past-week logic

---

## Implementation Phases

### Phase 1: Data Layer (Schema + Types + Repository)

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/db/types/index.ts`
- [ ] `src/db/models/weekly-menu.model.ts`
- [ ] `src/lib/menu/repository.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-057/requirements.md, work/PR-057/design.md
- Read: src/db/types/index.ts, src/db/models/weekly-menu.model.ts, src/lib/menu/repository.ts

Task:
1. In src/db/types/index.ts:
   - Add 'published' to WeeklyMenuStatus union type (keep 'survey-sent' and 'locked-in' for backward compat)
   - Replace IWeeklyMenuVote with new shape: { voterId: Types.ObjectId, assignmentId: Types.ObjectId, votedAt: Date }
   - Add optional publishedAt?: Date to IWeeklyMenu

2. In src/db/models/weekly-menu.model.ts:
   - Add 'published' to the status enum array
   - Update voteSchema to match new IWeeklyMenuVote (voterId ref User, assignmentId ObjectId, votedAt)
   - Add publishedAt field (Date, optional)
   - Add index: { status: 1, publishedAt: -1 }

3. In src/lib/menu/repository.ts:
   - Add findPublishedByWeek(weekLabel, excludeOwnerId): find published menus for a week by other users
   - Add addVote(menuId, voterId, assignmentId): push vote subdoc
   - Add removeVote(menuId, voterId, assignmentId): pull vote subdoc
   - Add findVote(menuId, voterId, assignmentId): check if vote exists
   - Add countVotesForAssignment(menuId, assignmentId): count votes for an assignment

MUST DO:
- Keep backward compat: do NOT remove 'survey-sent' or 'locked-in' from enums
- Follow existing repository patterns (see findById, findByWeek, etc.)
- Use proper TypeScript types, no 'any'

MUST NOT DO:
- Do not modify service.ts (Phase 2)
- Do not modify any API routes
- Do not modify any UI components
- Do not remove existing repository functions

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 2: Service Layer (Business Logic + Shopping List Append)

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/lib/menu/service.ts`
- [ ] `src/lib/shopping/service.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-057/requirements.md, work/PR-057/design.md
- Read: src/lib/menu/service.ts (current sendSurvey, cancelSurvey, finalizeMenu, unlockMenu)
- Read: src/lib/menu/repository.ts (the new functions from Phase 1)
- Read: src/lib/shopping/service.ts (existing createShoppingList, addManualItem, getUserShoppingLists)
- Read: src/lib/shopping/aggregator.ts (aggregateIngredients)

Task:
1. In src/lib/shopping/service.ts, add:
   appendItemsToList(listId: string, items: Partial<IShoppingListItem>[]): Promise<number>
   - Find list by ID
   - Push all items into list.items array
   - Save and return count of items added
   - No deduplication — items are appended as-is

2. In src/lib/menu/service.ts, add:

   publishMenu(menuId: string): Promise<{ publishedAt: Date }>
   - Menu must be in 'building' status
   - Must have at least 1 assignment
   - Sets status to 'published', sets publishedAt
   - Logs: 'Menu published'

   unpublishMenu(menuId: string): Promise<void>
   - Menu must be in 'published' status
   - Sets status to 'building', clears publishedAt
   - Clears votes
   - Logs: 'Menu unpublished'

   toggleVote(menuId: string, userId: string, assignmentId: string): Promise<{ voted: boolean, voteCount: number }>
   - Menu must be in 'published' status
   - Assignment must exist in the menu
   - If vote exists → remove, return voted: false
   - If no vote → add, return voted: true
   - Return voteCount for that assignment

   sendToShoppingList(menuId: string, ownerId: string): Promise<{ shoppingListId: string, alerts: FinalizeAlert[], itemsAdded: number, createdNewList: boolean }>
   - Menu must be in 'published' status
   - Reuse existing helpers: collectRecipeIds, buildIngredientList, aggregateToShoppingItems
   - Find user's active shopping list via getUserShoppingLists(ownerId) → take first
   - If active list exists → call appendItemsToList with new items
   - If no active list → create new ShoppingList with the items
   - Menu status stays 'published'
   - Logs: 'Items appended to shopping list' or 'Shopping list created from menu'

MUST DO:
- Reuse existing MenuError class and patterns
- Reuse existing ingredient aggregation logic (don't duplicate)
- Add withTrace spans matching design.md
- Keep all existing functions for backward compat

MUST NOT DO:
- Do not delete existing service functions
- Do not modify API routes (Phase 3)
- Do not modify UI components
- Do not use 'any' type
- Do not deduplicate against existing shopping list items

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 3: API Routes

**Dependencies**: Phase 2

**Deliverables**:
- [ ] `src/app/api/menu/[id]/publish/route.ts`
- [ ] `src/app/api/menu/[id]/vote/route.ts`
- [ ] `src/app/api/menu/[id]/shopping-list/route.ts`
- [ ] `src/app/api/menu/family/route.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-057/design.md (API Design section)
- Read: src/app/api/menu/[id]/survey/route.ts (reference pattern for auth, tracing, error handling)
- Read: src/app/api/menu/route.ts (reference for GET list pattern)
- Read: src/lib/menu/service.ts (the new functions from Phase 2)

Task:
1. Create src/app/api/menu/[id]/publish/route.ts
   - POST: publishMenu(id) — requires family role, must own menu
   - DELETE: unpublishMenu(id) — requires family role, must own menu
   - Follow exact same auth/trace/error pattern as survey/route.ts

2. Create src/app/api/menu/[id]/vote/route.ts
   - POST: toggleVote(menuId, userId, assignmentId) — any authenticated user
   - Parse { assignmentId } from request body
   - Return { voted, voteCount }

3. Create src/app/api/menu/[id]/shopping-list/route.ts
   - POST: sendToShoppingList(menuId, ownerId) — requires family role, must own menu
   - Return { shoppingListId, alerts, itemsAdded, createdNewList }

4. Create src/app/api/menu/family/route.ts
   - GET: list published menus for a given week by other family members
   - Query param: ?week=2026-W12
   - Any authenticated user
   - Uses findPublishedByWeek(weekLabel, currentUserId) from repository
   - Return { menus: [...] }

MUST DO:
- Follow existing route patterns exactly (withRequestContext, withTrace, cookie auth)
- Use proper HTTP status codes
- Include span attributes for observability
- Validate request body on POST routes
- Check ownership for publish/unpublish/shopping-list routes

MUST NOT DO:
- Do not modify existing routes (survey, finalize, unlock)
- Do not modify UI components
- Do not add new npm dependencies

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 4: Planner Page Updates (Publish Actions + Calendar Nav)

**Dependencies**: Phase 3

**Deliverables**:
- [ ] `src/components/menu/planner-actions.tsx`
- [ ] `src/components/menu/status-badge.tsx`
- [ ] `src/components/menu/week-switcher.tsx`
- [ ] `src/components/menu/calendar-grid.tsx`
- [ ] `src/components/menu/planner-page.tsx`
- [ ] `src/app/(main)/menu/page.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-057/design.md (UI Components section, Week Navigation section)
- Read: src/components/menu/planner-actions.tsx, status-badge.tsx, planner-page.tsx
- Read: src/components/menu/week-switcher.tsx, calendar-grid.tsx
- Read: src/app/(main)/menu/page.tsx
- Read: src/lib/menu/week-utils.ts

Task:
1. In status-badge.tsx:
   - Add 'published' to STATUS_CONFIG with label "Published" and appropriate className
   - Keep existing statuses for backward compat

2. In planner-actions.tsx:
   - Replace BuildingActions: "Send Survey" → "Publish" (calls POST /api/menu/[id]/publish)
   - Replace SurveySentActions with PublishedActions:
     - "Unpublish" button (calls DELETE /api/menu/[id]/publish)
     - "Send to Shopping List" button (calls POST /api/menu/[id]/shopping-list)
   - Show confirmation with item count after successful send
   - Add 'published' to MenuStatus type
   - Keep LockedInActions for backward compat

3. In week-switcher.tsx:
   - Replace 2-tab pill with arrow-based calendar nav: ◀ prev | week date range | next ▶
   - Accept currentWeekLabel prop to show "This Week" indicator
   - onSwitch now passes a weekLabel string (not 'current'|'next')

4. In calendar-grid.tsx:
   - Add optional readOnly prop (default false)
   - When readOnly, disable all drop targets and drag interactions
   - Pass readOnly through to DayRow → MealSlot

5. In planner-page.tsx:
   - Determine if viewing a past week (weekStartDate + 7 days < now)
   - If past week: set readOnly on CalendarGrid, hide RecipeSourcePanel and PlannerActions
   - Update WeekSwitcher integration for new arrow-based API
   - Published status allows drag-and-drop editing (owner can still edit current/future weeks)

6. In src/app/(main)/menu/page.tsx:
   - Accept optional ?week= query parameter
   - If week is past and no menu exists → don't auto-create, show empty state
   - If week is current/future → getOrCreateMenuForWeek as before

MUST DO:
- Match existing button/component styling
- Show loading states during API calls
- Handle errors gracefully
- Keep drag-and-drop functional in published state for current/future weeks

MUST NOT DO:
- Do not remove LockedInActions entirely (backward compat)
- Do not modify day-row, meal-slot, card-fan (unrelated)
- Do not add new npm dependencies

Verification:
- npm run typecheck passes
- npm run lint passes
- Visual: calendar nav works, past weeks are read-only, Publish/Unpublish buttons work
```

---

### Phase 5: Family Menu Section + Voting UI

**Dependencies**: Phase 3, Phase 4

**Deliverables**:
- [ ] `src/components/menu/family-menu-section.tsx`
- [ ] `src/components/menu/family-menu-card.tsx`
- [ ] `src/components/menu/vote-button.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-057/design.md (Component Architecture, UI Components sections)
- Read: src/components/menu/planner-page.tsx (where family section will be added)
- Read: src/components/menu/calendar-grid.tsx, day-row.tsx, recipe-tile.tsx
- Read: src/components/menu/home-widget.tsx (reference for compact menu display)

Task:
1. Create src/components/menu/family-menu-section.tsx
   - Fetches family menus for current week via GET /api/menu/family?week=XXXX-WXX
   - Shows "Family Menus" heading
   - Renders FamilyMenuCard for each published menu from other users
   - Empty state: nothing shown (no "no menus" message — just absent)
   - Refresh on week change

2. Create src/components/menu/family-menu-card.tsx
   - Shows: owner name, recipe count, total vote count
   - Expandable: tap to reveal read-only calendar grid with recipe tiles
   - Each recipe tile has a VoteButton overlay
   - Collapsed by default

3. Create src/components/menu/vote-button.tsx
   - Heart/thumbs-up toggle icon
   - Calls POST /api/menu/[id]/vote with { assignmentId }
   - Optimistic UI: toggle immediately, revert on error
   - Shows vote count next to icon
   - Small enough to overlay on recipe tiles

4. Wire FamilyMenuSection into planner-page.tsx
   - Render below the CalendarGrid
   - Pass current weekLabel so it fetches the right week's family menus

MUST DO:
- Follow mobile-first responsive design
- Use existing Button/Card UI components
- Optimistic UI for vote toggle
- Handle loading and error states

MUST NOT DO:
- Do not add real-time/websocket features
- Do not modify existing planner components (day-row, meal-slot, etc.)
- Do not add new npm dependencies
- Do not add navigation links (user will decide placement)

Verification:
- npm run typecheck passes
- npm run lint passes
- npm run build passes
- Visual: family menus shown below planner, voting works
```

---

### Phase 6: Verification & Cleanup

**Dependencies**: All previous phases

**Deliverables**:
- [ ] All lint/typecheck/build passing
- [ ] Manual verification of full flow

**Agent Prompt**:
```
Task:
1. Run npm run lint:fix && npm run lint
2. Run npm run typecheck
3. Run npm run build
4. Fix any errors

5. Manual verification checklist:
   - Build a menu with recipes → tap Publish → verify status badge shows "Published"
   - View /menu as another family member → see published menu in Family Menus section
   - Expand family menu card → see recipe tiles with vote buttons
   - Vote on a recipe → verify toggle works and count updates
   - As owner: tap "Send to Shopping List" → verify items appended to active list
   - As owner: tap "Send to Shopping List" with no active list → verify new list created
   - As owner: tap "Unpublish" → verify menu returns to building
   - Navigate to previous week via ◀ arrow → verify read-only mode (no drag-drop)
   - Navigate to next week via ▶ arrow → verify editable mode
   - Verify planner drag-drop still works in published state

6. Update work/PR-057/progress.md with session results

Verification:
- All commands exit 0
- Full flow works end-to-end
```

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 1 ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 4 ░░░░░░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░
Phase 5 ░░░░░░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░
Phase 6 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░
─────────────────────────────────────────────────────────────

Phases 1→2→3 are strictly sequential (data→service→API).
Phases 4 and 5 can run in parallel after Phase 3.
Phase 6 is final verification after all others.
```

---

## Session Log

### Session 0 - 2026-03-12

**Agent**: Claude Code (Sisyphus)
**Status**: Planning complete

**Completed**:
- [x] Created requirements.md
- [x] Created design.md
- [x] Created progress.md
- [x] Added deliverables to scripts/deliverables.yaml

### Session 0.1 - 2026-03-12

**Agent**: Claude Code (Sisyphus)
**Status**: Design revision

**Completed**:
- [x] Updated all docs: "Send to Shopping List" now appends to active list (not creates new)
- [x] Updated all docs: published menus live within /menu page (not separate /menus route)
- [x] Added calendar-style week navigation design (prev/next arrows, past weeks read-only)
- [x] Added FamilyMenuSection concept (below planner on /menu page)
- [x] Updated deliverables.yaml to match new file structure

**Next Steps**:
- [ ] User review and approval of requirements + design
- [ ] Begin Phase 1 implementation

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-057/` directory
- [ ] Update permanent docs if any behavior docs reference the old survey flow
- [ ] Remove any debug code or test data
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
