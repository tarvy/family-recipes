# PR-057: Menu Publish Flow & Calendar-Style Menu Navigation - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-03-12
> **Author**: Claude Code (Sisyphus)

---

## Overview

Replace the `survey-sent` → `locked-in` state machine with a simpler `building` → `published` flow. Published menus remain editable by their owner, are visible to family members within the existing `/menu` page (calendar-style week navigation), support per-assignment voting, and have a manual "Send to Shopping List" action that appends ingredients to the user's active shopping list without changing the menu's status. Past weeks become read-only but persist like calendar events.

---

## Architecture

### State Machine Change

```
CURRENT:
  building ──[Send Survey]──► survey-sent ──[Finalize]──► locked-in
                                  │                           │
                              [Cancel Survey]            [Unlock & Edit]
                                  │                           │
                                  ▼                           ▼
                               building                    building

NEW:
  building ──[Publish]──► published ──[Unpublish]──► building
                              │
                        [Send to Shopping List]
                              │
                              ▼
                     (creates ShoppingList, menu stays published)
```

### Component Architecture

```
Menu Page (/menu) — MODIFIED (calendar-style)
├── WeekSwitcher (MODIFIED — calendar nav: ◀ prev | week label | next ▶)
├── [Owner's Planner]
│   ├── RecipeSourcePanel (drag source)
│   ├── CalendarGrid (editable for current/future, read-only for past)
│   └── PlannerActions
│       ├── [building] → "Publish" button (replaces "Send Survey")
│       └── [published] → "Unpublish" + "Send to Shopping List"
└── [Family Menus Section] (below planner)
    └── FamilyMenuCard × N (other users' published menus for this week)
        ├── Owner name, recipe count, vote counts
        └── Expandable → read-only CalendarGrid with VoteButton per assignment

Past Week View (/menu?week=2026-W10)
├── WeekSwitcher (shows past week)
└── Read-only CalendarGrid (no drag-drop, no edit actions)
```

### Data Flow

```
Publish:
  Owner taps "Publish" → POST /api/menu/[id]/publish
  → service.publishMenu(id) → updateStatus(id, 'published', { publishedAt })
  → menu visible to family on /menu page for that week

Vote:
  User taps vote on assignment → POST /api/menu/[id]/vote
  → body: { assignmentId, action: 'add' | 'remove' }
  → service.toggleVote(menuId, assignmentId, userId)
  → vote stored as { voterId, assignmentId, votedAt }

Send to Shopping List (append):
  Owner taps "Send to Shopping List" → POST /api/menu/[id]/shopping-list
  → service.sendToShoppingList(menuId, ownerId)
  → reuses existing ingredient aggregation logic from finalizeMenu
  → finds user's active shopping list (or creates one if none exists)
  → appends aggregated items to the list (no dedup with existing items)
  → returns { shoppingListId, alerts, itemsAdded }
  → menu status stays "published"
```

---

## Database Changes

### Schema Modifications

| Collection | Change | Migration Required |
|------------|--------|-------------------|
| `WeeklyMenu` | Add `'published'` to status enum | No (additive) |
| `WeeklyMenu` | Add `publishedAt` field | No (optional field) |
| `WeeklyMenu` | Restructure `votes` subdoc | Yes (see below) |
| `WeeklyMenu` | Add index on `status` (non-unique) | No (additive) |

### Vote Schema Change

Current votes are per-menu (voter picks from assignments). New votes are per-assignment toggles.

```typescript
// CURRENT
interface IWeeklyMenuVote {
  voterName: string;
  voterToken: string;      // anonymous token
  picks: Types.ObjectId[]; // assignment IDs
  votedAt: Date;
}

// NEW
interface IWeeklyMenuVote {
  voterId: Types.ObjectId;   // authenticated user ID
  assignmentId: Types.ObjectId; // which assignment they voted for
  votedAt: Date;
}
```

### New Index

```javascript
weeklyMenuSchema.index({ status: 1, publishedAt: -1 });
// For the published menus browse page query
```

---

## API Design

### `POST /api/menu/[id]/publish`

**Purpose**: Transition menu from `building` → `published`.

**Auth**: Owner/family role, must own the menu.

**Response**: `{ status: 'published', publishedAt: string }`

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Menu has no assignments |
| 409 | CONFLICT | Menu not in `building` status |

### `DELETE /api/menu/[id]/publish`

**Purpose**: Unpublish a menu (`published` → `building`).

**Auth**: Must own the menu.

**Response**: `{ status: 'building' }`

### `POST /api/menu/[id]/vote`

**Purpose**: Toggle vote on a specific assignment.

**Auth**: Any authenticated user (owner, family, or friend).

**Request**:
```typescript
{ assignmentId: string }
```

**Response**: `{ voted: boolean, voteCount: number }`

**Logic**: If user already voted for this assignment → remove vote. Otherwise → add vote.

### `POST /api/menu/[id]/shopping-list`

**Purpose**: Append menu ingredients to the user's active shopping list.

**Auth**: Must own the menu.

**Response**:
```typescript
{
  shoppingListId: string;
  alerts: FinalizeAlert[];     // reuses existing type
  itemsAdded: number;
  createdNewList: boolean;
}
```

**Logic**:
1. Reuses `collectRecipeIds` → `buildIngredientList` → `aggregateToShoppingItems` from existing `finalizeMenu`
2. Finds user's active shopping list via `getUserShoppingLists(ownerId)` → first active list
3. If active list exists → push items into `list.items` array (no dedup), save
4. If no active list → create new `ShoppingList` with the items
5. Does NOT change menu status. Does NOT store `shoppingListId` on menu (list is independent).

### `GET /api/menu/family`

**Purpose**: List other family members' published menus for a given week.

**Auth**: Any authenticated user.

**Query**: `?week=2026-W12`

**Response**:
```typescript
{
  menus: Array<{
    id: string;
    weekLabel: string;
    ownerId: string;
    ownerName: string;
    assignments: SerializedAssignment[];
    votes: SerializedVote[];
    publishedAt: string;
  }>;
}
```

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `FamilyMenuSection` | `src/components/menu/family-menu-section.tsx` | Section showing other users' published menus for the current week |
| `FamilyMenuCard` | `src/components/menu/family-menu-card.tsx` | Expandable card for a family member's published menu |
| `VoteButton` | `src/components/menu/vote-button.tsx` | Per-assignment vote toggle |

### Modified Components

| Component | Change |
|-----------|--------|
| `planner-actions.tsx` | Replace Send Survey/Cancel Survey/Finalize with Publish/Unpublish/Send to Shopping List |
| `status-badge.tsx` | Add `published` status config, keep `building`, deprecate `survey-sent`/`locked-in` |
| `planner-page.tsx` | Wire new action callbacks, add FamilyMenuSection, add past-week read-only mode |
| `week-switcher.tsx` | Calendar-style nav with prev/next arrows (not just 2 tabs), support arbitrary weeks |
| `calendar-grid.tsx` | Accept `readOnly` prop to disable drag-drop for past weeks and non-owner views |

### No New Pages

Published menus are integrated into the existing `/menu` page. No separate routes needed.

---

## File Structure

```
src/
├── app/
│   └── api/
│       └── menu/
│           ├── [id]/
│           │   ├── publish/route.ts        # POST (publish) + DELETE (unpublish)
│           │   ├── vote/route.ts           # POST (toggle vote)
│           │   └── shopping-list/route.ts  # POST (append to shopping list)
│           └── family/route.ts             # GET (family published menus for a week)
├── components/menu/
│   ├── family-menu-section.tsx             # NEW
│   ├── family-menu-card.tsx                # NEW
│   ├── vote-button.tsx                     # NEW
│   ├── planner-actions.tsx                 # MODIFIED
│   ├── status-badge.tsx                    # MODIFIED
│   ├── planner-page.tsx                    # MODIFIED (family section, read-only past weeks)
│   ├── week-switcher.tsx                   # MODIFIED (calendar-style prev/next)
│   └── calendar-grid.tsx                   # MODIFIED (readOnly prop)
├── db/
│   ├── models/weekly-menu.model.ts         # MODIFIED (status enum, vote schema)
│   └── types/index.ts                      # MODIFIED (status type, vote interface)
└── lib/
    ├── menu/
    │   ├── service.ts                      # MODIFIED (publishMenu, sendToShoppingList, toggleVote)
    │   └── repository.ts                   # MODIFIED (findPublishedByWeek, vote queries)
    └── shopping/
        └── service.ts                      # MODIFIED (appendItemsToList)
```

---

## Dependencies

### New Packages

None. All functionality built with existing stack.

### Internal Dependencies

- Reuses: `src/lib/shopping/aggregator.ts` (ingredient aggregation)
- Reuses: `src/lib/shopping/service.ts` (getUserShoppingLists for finding active list)
- Reuses: `src/lib/menu/ingredient-validator.ts` (discovery recipe validation)
- Reuses: `src/db/models/shopping-list.model.ts` (ShoppingList item push)

---

## Security Considerations

- [x] Publish/unpublish: only menu owner can perform
- [x] Voting: any authenticated user (owner, family, friend)
- [x] Send to shopping list: only menu owner
- [x] Browse published: any authenticated user
- [x] Edit published menu (drag-drop): only menu owner via existing planner auth
- [x] No sensitive data in published view (no user emails, only names)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Menu published | info | menuId, weekLabel, assignmentCount |
| Menu unpublished | info | menuId |
| Vote toggled | info | menuId, assignmentId, userId, action |
| Items appended to shopping list | info | menuId, shoppingListId, itemsAdded, createdNewList |

### Traces

| Span | Attributes |
|------|------------|
| `menu.publish` | menuId, assignmentCount |
| `menu.unpublish` | menuId |
| `menu.vote` | menuId, assignmentId, userId |
| `menu.sendToShoppingList` | menuId, shoppingListId, itemsAdded, createdNewList |

---

## Testing Strategy

### Manual Verification

| Check | Expected |
|-------|----------|
| Build menu → Publish | Status changes, visible to family on /menu |
| View /menu as family member | See "Family Menus" section with other users' published menus |
| Expand family menu card | See full week layout with vote buttons |
| Vote on assignment | Vote count updates, toggle works |
| Owner taps "Send to Shopping List" | Items appended to active shopping list, confirmation shown |
| Owner taps "Send to Shopping List" (no active list) | New shopping list created with items |
| Owner taps "Unpublish" | Menu returns to building, disappears from family section |
| Non-owner views published menu | Can vote, cannot edit or unpublish |
| Navigate to previous week | See past menu in read-only mode (no drag-drop) |
| Navigate to next week | Can create/edit menu normally |
| Week switcher prev/next | Calendar-style browsing across weeks |
| Planner page shows Publish (building) | Correct button for building status |
| Planner page shows Unpublish (published) | Correct buttons for published status |

---

## Week Navigation (Calendar-Style)

### Current WeekSwitcher

Two-tab pill: "This Week" / "Next Week". Hardcoded to exactly 2 weeks.

### New WeekSwitcher

Arrow-based navigation: `◀ prev | "Mar 10 – 16" (2026-W11) | next ▶`

- Default view: current week
- Tap ▶: advance one week (no upper limit)
- Tap ◀: go back one week (no lower limit — shows menus as far back as they exist)
- Week label shows date range (existing `getWeekDateRange()` logic)
- Current week has a visual indicator (e.g., "This Week" badge)

### Read-Only Past Weeks

When viewing a week that has ended (weekStartDate + 7 days < now):
- `CalendarGrid` renders with `readOnly={true}` — no drop targets, no drag
- `PlannerActions` hidden (no publish/unpublish for past weeks)
- `RecipeSourcePanel` hidden (can't add recipes to past weeks)
- Menu data is fetched normally via `GET /api/menu?week=YYYY-WXX`
- If no menu exists for that past week → empty state "No menu planned for this week"

### Menu Page Server Component Change

The current `MenuPage` calls `getOrCreateMenuForWeek(user.id)` which auto-creates. For past weeks with no existing menu, we should NOT auto-create. Change to:
- Current/future week → `getOrCreateMenuForWeek()` (existing behavior)
- Past week → `findByWeek()` only (return null if none exists)

---

## Backward Compatibility

- `survey-sent` and `locked-in` statuses remain in the enum to avoid breaking existing data
- Existing menus in those statuses will show legacy badges but won't block anything
- The old `/api/menu/[id]/survey` and `/api/menu/[id]/finalize` routes can be deprecated (not deleted) in this PR
- The `/vote/[token]` public voting page is unaffected (can be cleaned up in a future PR)

---

## Alternatives Considered

### Option A: Keep survey-sent, just add notification mechanism
- **Pros**: Less rework
- **Cons**: Doesn't match user's mental model, overengineered for family use
- **Why rejected**: User explicitly wants "publish" semantics, not "survey" semantics

### Option B: Remove all voting, just publish + send to list (Selected simplified approach)
- **Pros**: Absolute minimum scope
- **Cons**: Loses voting which user explicitly wants
- **Why rejected**: User specifically said "published menus can be voted on by anyone"

### Option C: Publish + vote + manual send to list (Selected)
- **Pros**: Matches user's description exactly, reasonable scope
- **Cons**: More work than Option B
- **Why selected**: Direct implementation of user requirements
