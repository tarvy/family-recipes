# PR-052: Weekly Meal Planning, API Layer - Progress

> **Status**: Not Started
> **Started**: -
> **Target**: 2026-03-25
> **Branch**: `feat/052-meal-plan-api`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | 6 user stories, 15 endpoints defined |
| Design | [x] Approved | Full API specs, finalize logic detailed |
| Phase 1: Menu repository | [ ] Not Started | DB access layer |
| Phase 2: Ingredient validator | [ ] Not Started | parseability checker |
| Phase 3: Menu service | [ ] Not Started | Business logic + state machine |
| Phase 4: Discovery service | [ ] Not Started | Browsing + state tracking |
| Phase 5: Menu routes | [ ] Not Started | 6 route files |
| Phase 6: Vote + discovery routes | [ ] Not Started | 4 route files |
| Phase 7: Verification | [ ] Not Started | Lint, typecheck, manual testing |

---

## Deliverables Checklist

- [ ] `src/lib/menu/repository.ts` - WeeklyMenu DB access
- [ ] `src/lib/menu/service.ts` - Menu business logic + state machine
- [ ] `src/lib/menu/ingredient-validator.ts` - Ingredient parseability checker
- [ ] `src/lib/discovery/service.ts` - Discovery browsing + state management
- [ ] `src/app/api/menu/route.ts` - GET + POST menu
- [ ] `src/app/api/menu/[id]/route.ts` - GET + DELETE menu by ID
- [ ] `src/app/api/menu/[id]/assignments/route.ts` - POST + DELETE assignments
- [ ] `src/app/api/menu/[id]/survey/route.ts` - POST + DELETE survey
- [ ] `src/app/api/menu/[id]/finalize/route.ts` - POST finalize
- [ ] `src/app/api/menu/[id]/unlock/route.ts` - POST unlock
- [ ] `src/app/api/vote/[token]/route.ts` - GET + POST voting
- [ ] `src/app/api/discovery/route.ts` - GET discovery list/search
- [ ] `src/app/api/discovery/[id]/state/route.ts` - POST track state
- [ ] `src/app/api/discovery/refresh/route.ts` - POST trigger refresh

---

## Implementation Phases

### Phase 1: Menu Repository

**Dependencies**: PR-051 complete (WeeklyMenu model exists)

**Deliverables**:
- [ ] `src/lib/menu/repository.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for repository specification
- Read: src/db/models/weekly-menu.model.ts for the Mongoose model
- Read: src/lib/discovery/repository.ts for DB access layer pattern
- Read: src/lib/telemetry.ts for withTrace usage

Task:
1. Create src/lib/menu/repository.ts with these functions:
   - findByWeek(ownerId: string, weekLabel: string): find menu by owner + week
   - findById(id: string): find menu by _id
   - findByVotingToken(token: string): find menu by votingToken
   - create(ownerId: string, weekLabel: string, weekStartDate: Date): create new menu
   - findOrCreateForWeek(ownerId: string, weekLabel: string): find or auto-create
   - addAssignment(menuId: string, assignment: AddAssignmentInput): $push assignment
   - removeAssignment(menuId: string, assignmentId: string): $pull assignment
   - updateStatus(menuId: string, status: string, fields?: Partial<IWeeklyMenu>): atomic update
   - addVote(menuId: string, vote: VoteInput): upsert vote by voterToken
   - clearVotes(menuId: string): remove all votes
   - deleteMenu(menuId: string): delete document
   - deleteShoppingList(shoppingListId: string): delete linked shopping list

   Define input types: AddAssignmentInput, VoteInput.
   Wrap all DB calls with withTrace.
   Use logger for all operations.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 2: Ingredient Validator

**Dependencies**: PR-051 complete (DiscoveryRecipe model exists)

**Deliverables**:
- [ ] `src/lib/menu/ingredient-validator.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for ingredient validator specification
- Read: src/lib/shopping/aggregator.ts for parseQuantity() function
- Read: src/db/types/index.ts for IDiscoveryRecipe and IIngredient types

Task:
1. Create src/lib/menu/ingredient-validator.ts:
   - File header comment explaining purpose
   - Import parseQuantity from the shopping aggregator
   - validateDiscoveryIngredients(recipe: IDiscoveryRecipe): ValidationResult
     - For each ingredient in recipe.ingredients:
       - Attempt parseQuantity(ingredient.quantity, ingredient.unit)
       - Track which ingredients parse successfully vs fail
     - Return: { parseable: boolean, failedIngredients: string[] }
   - Define ValidationResult interface

   The key rule: if ALL ingredients parse, the recipe is included in the
   shopping list. If ANY fail, the entire recipe is excluded and added
   to the finalize alerts.

   This is a thin wrapper around existing parseQuantity(). No new
   parsing logic.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 3: Menu Service

**Dependencies**: Phase 1 + Phase 2

**Deliverables**:
- [ ] `src/lib/menu/service.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for service specification and finalize flow
- Read: src/lib/menu/repository.ts (created in Phase 1)
- Read: src/lib/menu/ingredient-validator.ts (created in Phase 2)
- Read: src/lib/shopping/service.ts for createShoppingList() signature
- Read: src/lib/menu/week-utils.ts (PR-051) for week label utilities

Task:
1. Create src/lib/menu/service.ts with these functions:

   Menu CRUD:
   - getOrCreateMenuForWeek(ownerId: string, weekLabel?: string): get current
     week menu or create. Use getCurrentWeekLabel() as default.
   - createMenuForWeek(ownerId: string, weekLabel: string): create specific week.
     Validate weekLabel format. Compute weekStartDate.
   - deleteMenu(menuId: string): verify status is building or survey-sent, then delete.

   Assignments:
   - addAssignment(menuId: string, input: AddAssignmentInput): verify menu is
     in building status, then add via repository.
   - removeAssignment(menuId: string, assignmentId: string): verify building
     status, then remove.

   Survey lifecycle:
   - sendSurvey(menuId: string): verify building status + at least 1 assignment.
     Generate votingToken via crypto.randomUUID(). Set votingOpenedAt=now,
     votingClosesAt=now+24h. Transition to survey-sent.
   - cancelSurvey(menuId: string): verify survey-sent status. Clear voting data.
     Transition to building.

   Finalize:
   - finalizeMenu(menuId: string, ownerId: string): The critical function.
     a. Verify status is survey-sent
     b. Separate assignments by source (cookbook vs discovery)
     c. Fetch cookbook recipes from Recipe model
     d. Fetch discovery recipes from DiscoveryRecipe model
     e. Run discovery recipes through ingredient validator
     f. Build recipe list for shopping: all cookbook + parseable discovery
     g. Call createShoppingList() with the included recipes
     h. Collect alerts for excluded discovery recipes
     i. Update menu: status=locked-in, finalizedAt, shoppingListId
     j. Return { shoppingListId, alerts }

   Unlock:
   - unlockMenu(menuId: string): verify locked-in status. Delete linked
     shopping list. Clear votes. Transition to building.

   Each function should:
   - Fetch the menu first to verify it exists
   - Check status before state transitions (throw 409 if wrong state)
   - Use logger for all operations
   - Use withTrace for DB-heavy operations

VOTING_WINDOW_HOURS = 24 as a named constant.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 4: Discovery Service

**Dependencies**: PR-051 complete (DiscoveryRecipe + UserDiscoveryState models)

**Deliverables**:
- [ ] `src/lib/discovery/service.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for discovery service specification
- Read: src/lib/discovery/repository.ts (PR-051) for existing DB access
- Read: src/lib/discovery/client.ts (PR-051) for TheMealDB fetch
- Read: src/db/models/user-discovery-state.model.ts (PR-051) for state model

Task:
1. Create src/lib/discovery/service.ts:
   - File header comment
   - Import repository functions from PR-051 discovery/repository.ts

   Functions:
   - listDiscoveryRecipes(page, limit, query?): paginated browse/search.
     If query provided, use text search. Otherwise list by quality score.
     Only return recipes with qualityScore >= MIN_QUALITY_SCORE (60).
     Return { recipes, total, page }.

   - trackUserState(userId, externalId, action): upsert UserDiscoveryState.
     Use findOneAndUpdate with upsert:true on {userId, externalId}.

   - getUserStates(userId, externalIds[]): batch fetch states for a list
     of recipes (for UI to show saved/dismissed indicators).

   - refreshFromSource(): orchestrate full re-fetch.
     Call fetchAll() from client.ts, clean, score, tag, upsert each.
     Return { added, updated, total }.
     This reuses the same pipeline as the CLI script but exposed as
     a service function.

   Use logger for all operations.
   Use withTrace for DB queries.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 5: Menu Routes

**Dependencies**: Phase 3 (menu service)

**Deliverables**:
- [ ] `src/app/api/menu/route.ts`
- [ ] `src/app/api/menu/[id]/route.ts`
- [ ] `src/app/api/menu/[id]/assignments/route.ts`
- [ ] `src/app/api/menu/[id]/survey/route.ts`
- [ ] `src/app/api/menu/[id]/finalize/route.ts`
- [ ] `src/app/api/menu/[id]/unlock/route.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for all endpoint specifications
- Read: src/app/api/shopping-list/route.ts for the exact API pattern to follow
- Read: src/lib/auth/session.ts for getSessionFromCookies
- Read: src/lib/auth/authorization.ts for isFamilyRole
- Read: src/lib/menu/service.ts (created in Phase 3)
- Read: src/lib/constants/http-status.ts for status code constants

Task:
Create 6 route files. Every route MUST follow this exact pattern:
  withRequestContext → withTrace → auth check → validate → try/catch → Response.json()

For each route file, add:
  - File header comment with route path and methods
  - export const runtime = 'nodejs'
  - Proper request/response type definitions
  - Auth: getSessionFromCookies for all routes
  - Role: isFamilyRole check for mutation endpoints
  - Error handling: try/catch with toError/toErrorMessage
  - Logging: withRequestContext + route-specific logger

1. src/app/api/menu/route.ts:
   - GET: getOrCreateMenuForWeek (session auth, any role)
   - POST: createMenuForWeek (family role)

2. src/app/api/menu/[id]/route.ts:
   - GET: findById (session auth, any role)
   - DELETE: deleteMenu (family role, status check)

3. src/app/api/menu/[id]/assignments/route.ts:
   - POST: addAssignment (family role)
   - DELETE: removeAssignment (family role)

4. src/app/api/menu/[id]/survey/route.ts:
   - POST: sendSurvey (family role)
   - DELETE: cancelSurvey (family role)

5. src/app/api/menu/[id]/finalize/route.ts:
   - POST: finalizeMenu (family role)

6. src/app/api/menu/[id]/unlock/route.ts:
   - POST: unlockMenu (family role)

Use HTTP status constants from src/lib/constants/http-status.ts.
Map service errors to proper HTTP status codes:
  - "not found" → 404
  - "wrong status" / "conflict" → 409
  - "bad request" → 400
  - unexpected errors → 500

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 6: Vote + Discovery Routes

**Dependencies**: Phase 1 (menu repository for votes) + Phase 4 (discovery service)

**Deliverables**:
- [ ] `src/app/api/vote/[token]/route.ts`
- [ ] `src/app/api/discovery/route.ts`
- [ ] `src/app/api/discovery/[id]/state/route.ts`
- [ ] `src/app/api/discovery/refresh/route.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-052/design.md for endpoint specifications
- Read: src/app/api/shopping-list/route.ts for API pattern
- Read: src/lib/menu/repository.ts (Phase 1) for vote operations
- Read: src/lib/discovery/service.ts (Phase 4) for discovery operations
- Read: src/lib/auth/session.ts, src/lib/auth/authorization.ts

Task:
Create 4 route files following the same pattern as Phase 5.

1. src/app/api/vote/[token]/route.ts:
   - GET: public, no auth. findByVotingToken. Return assignments, isOpen
     (votingClosesAt > now), votingClosesAt. 404 if token not found.
   - POST: public, no auth. Validate voterName + voterToken + picks.
     Check voting window (410 Gone if expired). Upsert vote by voterToken
     (replaces previous vote from same voter). 404 if token not found.
   - IMPORTANT: No getSessionFromCookies call in this file.

2. src/app/api/discovery/route.ts:
   - GET: session auth, any role. Parse query params: page, limit, q.
     Call listDiscoveryRecipes. Return paginated results.

3. src/app/api/discovery/[id]/state/route.ts:
   - POST: session auth, any role. Parse body: { action }.
     Validate action is one of 'seen', 'saved', 'dismissed'.
     Call trackUserState. Return success.

4. src/app/api/discovery/refresh/route.ts:
   - POST: owner role only (user.role === 'owner', NOT isFamilyRole).
     Call refreshFromSource from discovery service.
     Return { added, updated, total }.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 7: Verification

**Dependencies**: All previous phases

**Agent Prompt**:
```
Context:
- All 14 route and service files from Phases 1-6 are created

Task:
1. Run npm run lint:fix to auto-fix formatting
2. Run npm run lint and fix any remaining issues
3. Run npm run typecheck and fix any type errors
4. Verify all 14 deliverables exist
5. Spot-check each route file follows the pattern:
   - File header comment
   - export const runtime = 'nodejs'
   - withRequestContext → withTrace → auth → validate → try/catch
6. Verify the vote route has NO auth imports or calls
7. Verify the refresh route checks for owner role specifically
8. Verify finalize route calls the ingredient validator correctly
9. Check that all service functions are imported correctly in routes

Verification:
- npm run lint: zero errors
- npm run typecheck: zero errors
- All 14 deliverables checked off
```

---

## Parallel Work Streams

```
Timeline:
Phase 1 (repository) ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 (validator) ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 (menu svc) ░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 4 (disc svc) ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 5 (menu rts) ░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░
Phase 6 (vote+disc) ░░░░░░░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░
Phase 7 (verify) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░

Parallel opportunities after PR-051 is merged:
Stream A: Phase 1 → Phase 2 → Phase 3 → Phase 5  (menu path)
Stream B: Phase 4 → Phase 6                       (discovery path)
Merge: Phase 7 (needs both streams)
```

### Stream A: Menu Path

Phase 1 (repository) and Phase 2 (validator) can start in parallel. Phase 3 (service) needs both. Phase 5 (routes) needs Phase 3.

### Stream B: Discovery Path

Phase 4 (discovery service) depends only on PR-051 models, not on the menu service. Phase 6 vote routes need Phase 1's repository, but discovery routes only need Phase 4.

After both streams converge, Phase 7 verifies everything together.

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables registered in `scripts/deliverables.yaml`
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `python scripts/progress.py` shows PR-052 complete

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] File header comments on all new files
- [ ] All routes follow the withRequestContext pattern

### Integration Checks
- [ ] GET /api/menu auto-creates menu for current week
- [ ] State transitions enforced (409 on invalid transitions)
- [ ] Finalize creates shopping list from cookbook + parseable discovery recipes
- [ ] Finalize alerts list unparseable discovery recipes
- [ ] Vote endpoint works without auth cookies
- [ ] 24h voting window enforced (410 after expiry)
- [ ] Discovery refresh restricted to owner role

---

## Session Log

### Session 1 - 2026-03-11

**Agent**: Claude Code (Sisyphus)

**Completed**:
- [x] Requirements document created
- [x] Design document created
- [x] Progress document created

**Next Steps**:
- [ ] Wait for PR-051 to merge
- [ ] Phase 1: Menu repository
- [ ] Phase 2: Ingredient validator (parallel with Phase 1)
- [ ] Phase 4: Discovery service (parallel with Phase 1)
