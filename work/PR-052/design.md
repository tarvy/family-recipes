# PR-052: Weekly Meal Planning, API Layer - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-03-11
> **Author**: Claude Code (Sisyphus)

---

## Overview

Build the full REST API layer for weekly meal planning: menu CRUD, assignment management, voting survey lifecycle, menu finalization with shopping list generation, public voting, and discovery recipe browsing. Follows the existing API pattern of `withRequestContext` → `withTrace` → auth → validate → try/catch → `Response.json()`.

---

## Architecture

### System Context

```
Frontend (PR-053)
     │
     ▼
API Layer (this PR)
├── /api/menu/*           (authenticated, family role)
├── /api/vote/[token]     (public, no auth)
├── /api/discovery/*      (authenticated, session)
     │
     ├── Menu Service      (business logic, state machine)
     ├── Menu Repository   (WeeklyMenu DB access)
     ├── Discovery Service (discovery browsing, state tracking)
     ├── Ingredient Validator (parseability check)
     │
     ▼
Data Layer (PR-051)
├── WeeklyMenu model
├── DiscoveryRecipe model
├── UserDiscoveryState model
└── Shopping list service (existing)
```

### Component Design

```
Routes (thin controllers)
  │
  ├── /api/menu/*          → Menu Service → Menu Repository → WeeklyMenu model
  ├── /api/menu/*/finalize → Menu Service → Ingredient Validator
  │                                       → Shopping Service (existing)
  ├── /api/vote/*          → Menu Repository (direct, public)
  ├── /api/discovery/*     → Discovery Service → DiscoveryRecipe model
  └── /api/discovery/*/state → Discovery Service → UserDiscoveryState model
```

### Data Flow: Finalize Menu

```
POST /api/menu/[id]/finalize
  → Auth check (family role)
  → Verify status === 'survey-sent'
  → Separate assignments by source:
      cookbook[]  ← recipeId present
      discovery[] ← discoveryRecipeId present
  → Cookbook recipes: fetch from Recipe model, include all in shopping list
  → Discovery recipes: fetch from DiscoveryRecipe model
      → For each: run ingredients through parseQuantity()
      → ALL ingredients parse? Include in shopping list
      → ANY fail? Exclude recipe, add to alerts[]
  → Call createShoppingList() with included recipes
  → Update menu: status='locked-in', finalizedAt=now, shoppingListId
  → Return { shoppingListId, alerts: [{ recipeTitle, reason }] }
```

---

## Database Changes

No new models (PR-051 created them). This PR only reads and writes to:
- `WeeklyMenu` (CRUD, status transitions, assignments, votes)
- `DiscoveryRecipe` (read for browsing/search)
- `UserDiscoveryState` (create/update for tracking)
- `ShoppingList` (create via existing service during finalize)
- `Recipe` (read during finalize for cookbook recipes)

---

## API Design

### Endpoints

#### `GET /api/menu`

**Purpose**: Get the menu for a given week, auto-creating if none exists.

**Auth**: Session (any authenticated role)

**Request**: Query params: `?week=2026-W15` (optional, defaults to current week)

**Response**:
```typescript
interface MenuResponse {
  menu: IWeeklyMenu & { _id: string };
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | No valid session |

---

#### `POST /api/menu`

**Purpose**: Create a menu for a specific week.

**Auth**: Family role required

**Request**:
```typescript
interface CreateMenuRequest {
  weekLabel: string; // "2026-W20"
}
```

**Response**:
```typescript
interface MenuResponse {
  menu: IWeeklyMenu & { _id: string };
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_WEEK | weekLabel format invalid |
| 403 | FORBIDDEN | Not family role |
| 409 | DUPLICATE | Menu already exists for this week |

---

#### `GET /api/menu/[id]`

**Purpose**: Get a specific menu by ID.

**Auth**: Session (any authenticated role)

**Response**: Same as GET /api/menu

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | No valid session |
| 404 | NOT_FOUND | Menu doesn't exist |

---

#### `DELETE /api/menu/[id]`

**Purpose**: Delete a menu. Only allowed in building or survey-sent status.

**Auth**: Family role required

**Response**:
```typescript
{ success: true }
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not family role |
| 404 | NOT_FOUND | Menu doesn't exist |
| 409 | CONFLICT | Menu is locked-in |

---

#### `POST /api/menu/[id]/assignments`

**Purpose**: Add a recipe assignment to the menu.

**Auth**: Family role required

**Request**:
```typescript
interface AddAssignmentRequest {
  recipeId?: string;          // for cookbook recipes
  discoveryRecipeId?: string; // for discovery recipes
  title: string;
  thumbnailUrl?: string;
  source: 'cookbook' | 'discovery';
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  mealSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // default: 'dinner'
}
```

**Response**:
```typescript
interface AssignmentResponse {
  assignment: IWeeklyMenuAssignment & { _id: string };
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_INPUT | Missing required fields |
| 403 | FORBIDDEN | Not family role |
| 409 | CONFLICT | Menu not in building status |

---

#### `DELETE /api/menu/[id]/assignments`

**Purpose**: Remove an assignment from the menu.

**Auth**: Family role required

**Request**:
```typescript
interface RemoveAssignmentRequest {
  assignmentId: string;
}
```

**Response**:
```typescript
{ success: true }
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not family role |
| 404 | NOT_FOUND | Assignment not found |
| 409 | CONFLICT | Menu not in building status |

---

#### `POST /api/menu/[id]/survey`

**Purpose**: Open voting on the menu. Transitions building → survey-sent.

**Auth**: Family role required

**Response**:
```typescript
interface SurveyResponse {
  votingToken: string;
  votingUrl: string;  // full URL to /vote/[token]
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | NO_ASSIGNMENTS | Menu has zero assignments |
| 403 | FORBIDDEN | Not family role |
| 409 | CONFLICT | Menu not in building status |

---

#### `DELETE /api/menu/[id]/survey`

**Purpose**: Cancel the voting survey. Transitions survey-sent → building.

**Auth**: Family role required

**Response**:
```typescript
{ success: true }
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not family role |
| 409 | CONFLICT | Menu not in survey-sent status |

---

#### `POST /api/menu/[id]/finalize`

**Purpose**: Finalize the menu. Transitions survey-sent → locked-in. Creates shopping list.

**Auth**: Family role required

**Response**:
```typescript
interface FinalizeResponse {
  shoppingListId: string;
  alerts: Array<{
    recipeTitle: string;
    reason: string;
  }>;
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not family role |
| 409 | CONFLICT | Menu not in survey-sent status |

---

#### `POST /api/menu/[id]/unlock`

**Purpose**: Unlock a finalized menu. Transitions locked-in → building.

**Auth**: Family role required

**Response**:
```typescript
{ success: true }
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not family role |
| 409 | CONFLICT | Menu not in locked-in status |

---

#### `GET /api/vote/[token]`

**Purpose**: Get voting data for a survey. Public, no auth required.

**Response**:
```typescript
interface VoteDataResponse {
  assignments: Array<IWeeklyMenuAssignment & { _id: string }>;
  isOpen: boolean;
  votingClosesAt: string; // ISO date
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Invalid token |

---

#### `POST /api/vote/[token]`

**Purpose**: Submit a vote. Public, no auth required. Duplicate voterToken replaces previous vote.

**Request**:
```typescript
interface SubmitVoteRequest {
  voterName: string;
  voterToken: string;  // browser fingerprint for dedup
  picks: string[];     // assignment _id values
}
```

**Response**:
```typescript
{ success: true }
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Invalid token |
| 410 | GONE | Voting window closed |

---

#### `GET /api/discovery`

**Purpose**: List/search discovery recipes with pagination.

**Auth**: Session (any authenticated role)

**Request**: Query params: `?page=1&limit=20&q=search+terms`

**Response**:
```typescript
interface DiscoveryListResponse {
  recipes: Array<IDiscoveryRecipe & { _id: string }>;
  total: number;
  page: number;
}
```

---

#### `POST /api/discovery/[id]/state`

**Purpose**: Track user interaction with a discovery recipe.

**Auth**: Session (any authenticated role)

**Request**:
```typescript
interface TrackStateRequest {
  action: 'seen' | 'saved' | 'dismissed';
}
```

**Response**:
```typescript
{ success: true }
```

---

#### `POST /api/discovery/refresh`

**Purpose**: Trigger a full TheMealDB re-fetch. Owner only.

**Auth**: Owner role required

**Response**:
```typescript
interface RefreshResponse {
  added: number;
  updated: number;
  total: number;
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 403 | FORBIDDEN | Not owner role |

---

## File Structure

```
src/
├── lib/
│   ├── menu/
│   │   ├── repository.ts              # NEW: WeeklyMenu DB access
│   │   ├── service.ts                 # NEW: Business logic + state machine
│   │   └── ingredient-validator.ts    # NEW: parseability checker
│   └── discovery/
│       └── service.ts                 # NEW: Discovery browsing + state
├── app/
│   └── api/
│       ├── menu/
│       │   ├── route.ts                    # NEW: GET + POST
│       │   └── [id]/
│       │       ├── route.ts                # NEW: GET + DELETE
│       │       ├── assignments/
│       │       │   └── route.ts            # NEW: POST + DELETE
│       │       ├── survey/
│       │       │   └── route.ts            # NEW: POST + DELETE
│       │       ├── finalize/
│       │       │   └── route.ts            # NEW: POST
│       │       └── unlock/
│       │           └── route.ts            # NEW: POST
│       ├── vote/
│       │   └── [token]/
│       │       └── route.ts                # NEW: GET + POST
│       └── discovery/
│           ├── route.ts                    # NEW: GET
│           ├── [id]/
│           │   └── state/
│           │       └── route.ts            # NEW: POST
│           └── refresh/
│               └── route.ts                # NEW: POST
```

---

## Dependencies

### New Packages

None.

### Internal Dependencies

- `src/lib/auth/session.ts`: `getSessionFromCookies()` for auth
- `src/lib/auth/authorization.ts`: `isFamilyRole()` for role checks
- `src/lib/shopping/service.ts`: `createShoppingList()` for finalization
- `src/lib/shopping/aggregator.ts`: `parseQuantity()` for ingredient validation
- `src/lib/logger.ts`: `withRequestContext`, `logger`
- `src/lib/telemetry.ts`: `withTrace`
- `src/lib/constants/http-status.ts`: HTTP status constants
- `src/lib/errors.ts`: `toError`, `toErrorMessage`
- All 3 PR-051 models: `WeeklyMenu`, `DiscoveryRecipe`, `UserDiscoveryState`
- `src/lib/menu/week-utils.ts` (PR-051): week label utilities
- `src/lib/discovery/repository.ts` (PR-051): discovery recipe queries
- `src/lib/discovery/client.ts` (PR-051): TheMealDB fetch for refresh endpoint

---

## Security Considerations

- [x] All menu mutation endpoints require family role (`isFamilyRole` check)
- [x] Discovery refresh requires owner role
- [x] Vote endpoints are intentionally public (no auth) for frictionless family participation
- [x] Vote dedup uses voterToken (browser fingerprint), not IP address
- [x] Voting tokens are generated server-side with `crypto.randomUUID()`
- [x] Menu ID and assignment ID validated as valid ObjectId before DB query
- [x] All user input validated through request body parsing before touching the DB
- [x] No sensitive data exposed in vote responses (no user IDs, no email addresses)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Menu created | info | `{ ownerId, weekLabel }` |
| Menu deleted | info | `{ menuId, weekLabel }` |
| Assignment added | info | `{ menuId, source, day }` |
| Survey opened | info | `{ menuId, votingClosesAt }` |
| Survey cancelled | info | `{ menuId }` |
| Vote submitted | info | `{ menuId, voterName }` (no token) |
| Vote rejected (expired) | warn | `{ menuId, votingClosesAt }` |
| Menu finalized | info | `{ menuId, shoppingListId, alertCount }` |
| Menu unlocked | info | `{ menuId }` |
| Ingredient parse failure | warn | `{ recipeTitle, ingredientName }` |
| Discovery refresh triggered | info | `{ userId }` |
| Unauthorized access attempt | warn | `{ userId, role, endpoint }` |

### Traces

| Span | Attributes |
|------|------------|
| `menu.get` | `{ weekLabel }` |
| `menu.create` | `{ weekLabel }` |
| `menu.addAssignment` | `{ source, day }` |
| `menu.sendSurvey` | `{ menuId }` |
| `menu.finalize` | `{ menuId, assignmentCount }` |
| `menu.unlock` | `{ menuId }` |
| `vote.submit` | `{ menuId }` |
| `discovery.list` | `{ page, limit, query? }` |
| `discovery.trackState` | `{ action }` |
| `discovery.refresh` | `{ source }` |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `menu/repository.ts` | findByWeek, create, update, delete operations |
| `menu/service.ts` | State machine transitions, assignment add/remove, finalize logic |
| `menu/ingredient-validator.ts` | Parseable vs unparseable ingredients |
| `discovery/service.ts` | Pagination, search, state tracking |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Full menu lifecycle | building → survey-sent → locked-in → unlock → building |
| Finalize with mixed sources | Cookbook + discovery, some unparseable |
| Public voting | Token generation → vote submission → dedup |

### Manual Verification

| Check | Expected |
|-------|----------|
| GET /api/menu auto-creates | Menu returned for current week |
| POST assignment on building menu | Assignment added |
| POST assignment on locked-in menu | 409 Conflict |
| POST survey on building menu | votingToken returned |
| GET /api/vote/[token] without auth | Assignments returned |
| POST finalize with unparseable ingredients | Shopping list created + alerts returned |
| POST unlock deletes shopping list | Shopping list removed from DB |
| GET /api/discovery?q=chicken | Matching recipes returned |
| POST /api/discovery/refresh as non-owner | 403 Forbidden |

---

## Alternatives Considered

### Option A: GraphQL API

- **Pros**: Flexible querying, single endpoint
- **Cons**: Adds GraphQL dependency, different pattern from rest of app
- **Why rejected**: The app uses REST everywhere. Consistency matters more than query flexibility here.

### Option B: REST with repository/service layers (Selected)

- **Pros**: Matches existing codebase patterns, thin routes, testable business logic
- **Cons**: More files than putting logic in routes
- **Why selected**: Separation of concerns. The finalize flow alone has enough logic to justify a service layer. Routes stay thin and predictable.

---

## Open Design Questions

- [x] Should ingredient validator reuse parseQuantity() or have its own parser? **Reuse parseQuantity().** No new parsing logic.
- [x] How to handle concurrent assignment edits? **Last-write-wins via Mongoose `$push` / `$pull`.** No optimistic locking needed for family-sized usage.
- [x] Should refresh endpoint run synchronously? **Yes for now.** TheMealDB has ~300 recipes. Async background job is overkill at this scale.
