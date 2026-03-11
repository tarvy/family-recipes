# PR-054: Public Voting Page + Home Widget - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-03-11
> **Target**: TBD
> **Branch**: `feat/054-voting-home-widget`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | 4 user stories with Gherkin criteria |
| Design | [x] Approved | Voting flow, fingerprint, widget layout |
| Phase 1: Voting page | [ ] Not Started | Server page + client voting UI |
| Phase 2: Fingerprint + submission | [ ] Not Started | Browser hash + vote API |
| Phase 3: Home widget | [ ] Not Started | 7-day strip on /recipes |
| Verification | [ ] Not Started | Lint, typecheck, manual testing |

---

## Deliverables Checklist

- [ ] `src/app/vote/[token]/page.tsx` - Server component: load by token, route to view
- [ ] `src/components/voting/voting-page.tsx` - Client root: candidates + name + submit
- [ ] `src/components/voting/recipe-candidate.tsx` - Tappable card with vote toggle
- [ ] `src/components/voting/voter-name-input.tsx` - Display name input
- [ ] `src/components/voting/voting-closed.tsx` - Static view after finalization
- [ ] `src/components/menu/home-widget.tsx` - Compact 7-day strip
- [ ] `src/components/menu/home-widget-day.tsx` - Single day cell
- [ ] `src/lib/fingerprint.ts` - Canvas + screen + timezone browser fingerprint
- [ ] `src/app/(main)/recipes/page.tsx` - MODIFIED: render home widget conditionally

---

## Implementation Phases

### Phase 1: Voting Page (Server + Client Components)

**Dependencies**: PR-052 merged (voting API endpoints available)

**Deliverables**:
- [ ] `src/app/vote/[token]/page.tsx`
- [ ] `src/components/voting/voting-page.tsx`
- [ ] `src/components/voting/recipe-candidate.tsx`
- [ ] `src/components/voting/voter-name-input.tsx`
- [ ] `src/components/voting/voting-closed.tsx`

**Agent Prompt**:
```
Context:
- Read: work/PR-054/requirements.md, work/PR-054/design.md
- Read: docs/ARCHITECTURE.md for project patterns
- Read: src/app/r/[slug]/page.tsx for public route pattern reference (no auth, outside (main) layout)
- Read: src/middleware.ts to understand public path configuration
- The voting page is PUBLIC: no auth, no (main) layout, no session cookies

Task:
1. Update middleware to add /vote to public paths:
   - Find the matcher or public path array in src/middleware.ts
   - Add /vote/[token] alongside existing public routes like /r/[slug]

2. Create src/app/vote/[token]/page.tsx as a server component:
   - NO auth check, NO getSessionFromCookies
   - Fetch WeeklyMenu by votingToken from the API: GET /api/weekly-menu/by-token/[token]
   - If not found: render a "Not found" message (simple div, no fancy 404)
   - If status === "locked-in": render <VotingClosed> with the finalized plan
   - If votingClosesAt < new Date(): render "Voting has ended" message
   - Otherwise: render <VotingPage> with candidates from assignments[]
   - Minimal page: no app navigation, no header, just the voting content
   - Add metadata: title "Vote on This Week's Meals"

3. Create src/components/voting/voting-closed.tsx:
   - Static server-friendly component showing the finalized meal plan
   - List each day's assigned recipes (read-only, no interaction)
   - Message: "Voting is closed. Here's what's planned:"
   - No buttons, no forms, no client interactivity
   - Style: bg-card cards for each day, cocoa text

4. Create src/components/voting/recipe-candidate.tsx:
   - Client component ("use client")
   - Tappable card showing recipe thumbnail, title, brief description
   - Two states: default (bg-card) and selected (bg-card + 2px lavender ring + slight scale)
   - Accept recipe, isSelected, onToggle props
   - On tap: call onToggle(recipeId)
   - Smooth transition between states (150ms)

5. Create src/components/voting/voter-name-input.tsx:
   - Client component ("use client")
   - Simple text input for display name
   - Placeholder: "Your name"
   - Accept value, onChange props
   - Style: matches existing input patterns in the app

6. Create src/components/voting/voting-page.tsx:
   - Client component ("use client")
   - Accept candidates (recipes from assignments), menuId, existingVote props
   - Manage state: selectedRecipeIds (Set), voterName
   - If existingVote provided: pre-populate selections and name
   - Render RecipeCandidate for each candidate recipe
   - Render VoterNameInput below candidates
   - Render "Submit Vote" button (disabled if no selections or no name)
   - On submit: call POST /api/weekly-menu/[menuId]/vote with voterToken, voterName, recipeIds
   - Show loading state during submission
   - Show confirmation message on success
   - voterToken comes from fingerprint (Phase 2 will wire this; for now accept as prop)

Verification:
- npm run typecheck passes
- npm run lint passes
- /vote/[valid-token] renders candidate cards (with mock/placeholder fingerprint)
- /vote/[invalid-token] shows "Not found"
- Tapping candidates toggles selection ring
- VotingClosed renders for locked-in menus

Output:
- Files created: vote/[token]/page.tsx, voting-page.tsx, recipe-candidate.tsx,
  voter-name-input.tsx, voting-closed.tsx
- Files modified: middleware.ts (add /vote to public paths)
```

---

### Phase 2: Browser Fingerprint + Vote Submission

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/lib/fingerprint.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-054/design.md (Browser Fingerprint Implementation section)
- Read: src/components/voting/voting-page.tsx (needs to generate and use fingerprint)
- The fingerprint identifies returning voters so the same browser replaces its previous vote

Task:
1. Create src/lib/fingerprint.ts:
   - Export async function generateFingerprint(): Promise<string>
   - Canvas fingerprint:
     - Create offscreen canvas (300x150)
     - Set specific font, fill style, draw text "Family Recipes Voter"
     - Draw a colored rectangle and arc for renderer variation
     - Get canvas.toDataURL()
   - Screen fingerprint:
     - Concatenate: screen.width, screen.height, screen.colorDepth, screen.pixelDepth
   - Timezone fingerprint:
     - Intl.DateTimeFormat().resolvedOptions().timeZone
   - Combine all three strings
   - Hash with SHA-256 via crypto.subtle.digest()
   - Return hex string
   - Handle edge cases: if crypto.subtle unavailable (HTTP context), fall back to simple string hash
   - If canvas API unavailable, omit that portion (still hash screen + timezone)

2. Wire fingerprint into VotingPage:
   - On mount: call generateFingerprint(), store result in state
   - Pass fingerprint as voterToken in the vote submission payload
   - On page load: check if existing vote matches fingerprint
     (the server response from loading the menu should include votes;
      find vote where voterToken matches the generated fingerprint)
   - If match found: pre-populate selections and name from that vote

3. Verify vote replacement:
   - Submit a vote, then reload the page
   - Previous selections should be highlighted
   - Submitting again should replace (not duplicate) the vote

Verification:
- npm run typecheck passes
- npm run lint passes
- generateFingerprint() returns a consistent hex string on same browser
- Vote submission includes voterToken
- Reloading the page shows previous selections

Output:
- Files created: fingerprint.ts
- Files modified: voting-page.tsx (wire fingerprint)
```

---

### Phase 3: Home Widget

**Dependencies**: PR-052 merged (need locked-in menu data). Independent of Phase 1 and Phase 2.

**Deliverables**:
- [ ] `src/components/menu/home-widget.tsx`
- [ ] `src/components/menu/home-widget-day.tsx`
- [ ] `src/app/(main)/recipes/page.tsx` (MODIFIED)

**Agent Prompt**:
```
Context:
- Read: work/PR-054/design.md (Home Widget section)
- Read: work/PR-054/requirements.md (Story 4 acceptance criteria)
- Read: src/app/(main)/recipes/page.tsx (this is where the widget gets added)
- The widget only appears when a locked-in WeeklyMenu exists for the current ISO week

Task:
1. Create src/components/menu/home-widget-day.tsx:
   - Server component (no "use client" needed, just renders)
   - Accept props: dayLabel (string), recipe (object | null), isToday (boolean)
   - If recipe: show thumbnail image + truncated title (max ~20 chars)
   - If no recipe: show empty state (subtle dashed border or muted "—")
   - If isToday: add bg-pink highlight class
   - Wrap in a Link to /recipes/[slug] if recipe exists
   - Style: bg-card-nested, rounded corners, compact sizing

2. Create src/components/menu/home-widget.tsx:
   - Server component
   - Accept props: menu (WeeklyMenu with assignments), today (ISO date string)
   - Render a horizontal strip of 7 HomeWidgetDay cells
   - Map assignments to days: Sun through Sat
   - Determine which day is "today" for highlighting
   - Each day shows its abbreviated label (S, M, T, W, T, F, S) above the cell
   - Container: horizontal flex, overflow-x auto on mobile, gap between cells
   - Style: bg-card container with subtle shadow, rounded

3. Modify src/app/(main)/recipes/page.tsx:
   - After auth check, fetch current week's locked-in menu:
     GET /api/weekly-menu?week=current&status=locked-in (or equivalent query)
   - If a locked-in menu exists: render <HomeWidget> above the recipe grid
   - If no locked-in menu: don't render anything extra (recipe grid stays unchanged)
   - Pass menu data and today's date to HomeWidget
   - This should be a small, non-breaking addition to the existing page

Verification:
- npm run typecheck passes
- npm run lint passes
- /recipes with a locked-in menu: widget appears above grid
- /recipes without a locked-in menu: no widget, page unchanged
- Tapping a recipe in widget navigates to /recipes/[slug]
- Today's cell has pink highlight
- Widget looks good at 375px mobile width

Output:
- Files created: home-widget.tsx, home-widget-day.tsx
- Files modified: recipes/page.tsx
```

---

## Parallel Work Streams

```
Timeline:
─────────────────────────────────────────────────────────────
Phase 1 (Voting UI)     ████████████████░░░░░░░░░░░░░░░░░░░
Phase 2 (Fingerprint)   ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░  ← needs Phase 1
Phase 3 (Home Widget)   ████████████████░░░░░░░░░░░░░░░░░░░  ← independent
─────────────────────────────────────────────────────────────

Parallel Opportunities:
- Phase 1 + Phase 3 can run in parallel (completely independent)
- Phase 2 depends on Phase 1 (needs voting-page.tsx to wire into)
```

### Stream A: Voting Page (Phase 1 → Phase 2)
Sequential: build the page first, then add fingerprint and wire submission.

### Stream B: Home Widget (Phase 3)
Fully independent. Can run in parallel with Stream A from the start.

---

## Test Plan

### Manual Verification

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| /vote/[token] loads without auth | No redirect, page renders | | [ ] Pass [ ] Fail |
| /vote/[invalid] | "Not found" message | | [ ] Pass [ ] Fail |
| /vote/[token] with locked-in menu | VotingClosed rendered | | [ ] Pass [ ] Fail |
| /vote/[token] with expired voting | "Voting has ended" | | [ ] Pass [ ] Fail |
| Tap candidates | Selection ring toggles | | [ ] Pass [ ] Fail |
| Submit vote | API call succeeds, confirmation shown | | [ ] Pass [ ] Fail |
| Reload after voting | Previous selections pre-filled | | [ ] Pass [ ] Fail |
| Submit again | Vote replaced, not duplicated | | [ ] Pass [ ] Fail |
| /recipes with locked-in menu | Home widget appears | | [ ] Pass [ ] Fail |
| /recipes without locked-in menu | No widget | | [ ] Pass [ ] Fail |
| Tap recipe in widget | Navigates to /recipes/[slug] | | [ ] Pass [ ] Fail |
| Today highlighted in widget | Pink bg on current day | | [ ] Pass [ ] Fail |
| Network tab on /vote page | Zero auth cookies sent | | [ ] Pass [ ] Fail |

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
- [ ] Voting page has zero auth dependencies
- [ ] Fingerprint doesn't log or expose raw browser data

### Integration Checks
- [ ] Voting page works in incognito
- [ ] Home widget doesn't break existing /recipes page
- [ ] Mobile responsive (tested at 375px)
- [ ] No user data leakage on public voting page

---

## Session Log

(No sessions yet)

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Remove `work/PR-054/` directory
- [ ] Update permanent docs (`docs/*.md`) with voting page and widget documentation
- [ ] Remove any debug code or test data
- [ ] Verify `.progress.json` shows PR complete
- [ ] Final `npm run lint && npm run typecheck` passes
