# PR-054: Public Voting Page + Home Widget - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-03-11
> **Author**: Claude Code (Sisyphus)

---

## Overview

Two independent UI surfaces that consume PR-052's API. First: a public `/vote/[token]` page where household members (no account needed) tap recipe candidates to cast votes via browser fingerprint. Second: a compact 7-day widget on the `/recipes` page showing the locked-in weekly plan. Both are read-heavy, minimal-interaction components with no shared state between them.

---

## Architecture

### System Context

```
Public Voting Flow:
  /vote/[token] (NO auth, outside (main) layout)
    → Server: load WeeklyMenu by votingToken
    → Client: render candidates, collect taps, submit with fingerprint

Home Widget Flow:
  /recipes (authenticated, inside (main) layout)
    → Server: check for locked-in WeeklyMenu for current ISO week
    → If exists: render <HomeWidget> above recipe grid
    → If not: skip widget entirely
```

### Voting Page Component Hierarchy

```
<VotePage>                              ← Server component (public)
├── [locked-in?] → <VotingClosed />     ← Static finalized plan view
├── [expired?] → "Voting has ended"     ← Static message
└── [active] → <VotingPage>            ← Client component
    ├── <RecipeCandidate /> ×N          ← Tappable vote toggle cards
    ├── <VoterNameInput />              ← Display name field
    └── Submit button
```

### Home Widget Component Hierarchy

```
<RecipesPage>                           ← Existing server component
├── <HomeWidget>                        ← NEW: Conditionally rendered
│   └── <HomeWidgetDay /> ×7            ← Day cells, today highlighted
└── [existing recipe grid]
```

### Data Flow: Voting

```
Page Load:
  Server: getWeeklyMenuByToken(token)
    → null → 404 not found
    → status === "locked-in" → render VotingClosed
    → votingClosesAt < now → render "Voting has ended"
    → otherwise → serialize assignments as candidates

Vote Submission:
  Client: generateFingerprint() → hash(canvas + screen + timezone)
  Client: user taps candidates, enters name
  Client: POST /api/weekly-menu/[id]/vote
    body: { voterToken: fingerprint, voterName, recipeIds }
    → API upserts by voterToken (replaces if exists)
    → Show confirmation
```

### Data Flow: Home Widget

```
Page Load (server):
  getLockedInMenuForWeek(currentISOWeek)
    → null → don't render widget
    → exists → extract day-recipe pairs from assignments[]
    → pass to <HomeWidget> as props

Widget Render:
  7 day cells in a horizontal strip
  Each cell: recipe thumbnail + truncated title (or empty)
  Today's cell gets bg-pink highlight
  Tap any cell → navigate to /recipes/[slug]
```

---

## Database Changes

None. PR-052's WeeklyMenu model has all needed fields: `votingToken`, `votingClosesAt`, `votes[]`, `assignments[]`, `status`.

---

## API Usage

No new endpoints. Consumes PR-052's API:

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/api/weekly-menu/by-token/[token]` | GET | Load menu for voting page |
| `/api/weekly-menu/[id]/vote` | POST | Submit/replace vote |
| `/api/weekly-menu` | GET | Load locked-in menu for home widget |

---

## UI Components

### New Components (8 files)

| Component | File | Purpose |
|-----------|------|---------|
| `VotePage` | `src/app/vote/[token]/page.tsx` | Server: load by token, route to correct view |
| `VotingPage` | `src/components/voting/voting-page.tsx` | Client: candidate selection + submit |
| `RecipeCandidate` | `src/components/voting/recipe-candidate.tsx` | Tappable card with selection ring |
| `VoterNameInput` | `src/components/voting/voter-name-input.tsx` | Display name text input |
| `VotingClosed` | `src/components/voting/voting-closed.tsx` | Static read-only finalized view |
| `HomeWidget` | `src/components/menu/home-widget.tsx` | 7-day horizontal strip |
| `HomeWidgetDay` | `src/components/menu/home-widget-day.tsx` | Single day cell |
| `fingerprint` | `src/lib/fingerprint.ts` | Canvas + screen + timezone hash |

### Modified Files (1 file)

| File | Change |
|------|--------|
| `src/app/(main)/recipes/page.tsx` | Conditionally render HomeWidget above grid |

### Middleware Update

The `/vote` path needs to be added to public (unauthenticated) paths in the middleware configuration, alongside `/r/[slug]`.

### Browser Fingerprint Implementation

The fingerprint module generates a stable hash from three browser signals:

```
Canvas fingerprint:
  - Draw specific text/shapes on an offscreen canvas
  - toDataURL() produces renderer-specific output
  - Different GPUs/browsers produce different results

Screen fingerprint:
  - window.screen.width, height, colorDepth, pixelDepth
  - Stable per device

Timezone fingerprint:
  - Intl.DateTimeFormat().resolvedOptions().timeZone
  - Stable per user location

Combined:
  SHA-256(canvas + screen + timezone) → hex string → voterToken
```

This isn't meant to be tamper-proof. It's a convenience mechanism so the same browser auto-replaces its previous vote instead of creating duplicates. Determined users can vote from multiple browsers, and that's fine for a family meal poll.

### Design Tokens

Both surfaces use the existing design system:

| Token | Usage |
|-------|-------|
| `bg-card` | Voting candidate cards, widget container |
| `bg-card-nested` | Widget day cells |
| `bg-pink` | Today highlight in widget, submit button |
| Lavender ring | Selected candidate border |
| `text-cocoa` | Primary text |
| `text-cream` | Secondary/muted text |

### Voting Card States

```
Default:        bg-card, no ring, text-cocoa
Selected:       bg-card, 2px lavender ring, slight scale(1.02)
Hover (desktop): subtle shadow lift
```

---

## File Structure

```
src/
├── app/
│   ├── vote/
│   │   └── [token]/
│   │       └── page.tsx                   # NEW: Public voting page
│   └── (main)/
│       └── recipes/
│           └── page.tsx                   # MODIFIED: Add home widget
├── components/
│   ├── voting/
│   │   ├── voting-page.tsx                # NEW: Client voting root
│   │   ├── recipe-candidate.tsx           # NEW: Vote toggle card
│   │   ├── voter-name-input.tsx           # NEW: Name input
│   │   └── voting-closed.tsx              # NEW: Closed state view
│   └── menu/
│       ├── home-widget.tsx                # NEW: 7-day strip
│       └── home-widget-day.tsx            # NEW: Single day cell
└── lib/
    └── fingerprint.ts                     # NEW: Browser fingerprint hash
```

---

## Dependencies

### New Packages

None. The fingerprint uses the Web Crypto API (`crypto.subtle.digest`) for SHA-256 hashing. Canvas API and screen properties are standard browser APIs.

### Internal Dependencies

- PR-052's API endpoints (must be merged first)
- Existing design tokens
- Existing recipe data types
- Middleware public path configuration

---

## Security Considerations

- [x] Voting page is public (no auth), but can only read/vote on menus with valid tokens
- [x] Voting tokens are cryptographically random (generated by PR-052)
- [x] No user session data exposed on voting page
- [x] Fingerprint hash is one-way (can't reverse to identify the user)
- [x] Vote replacement by fingerprint prevents ballot stuffing from one device
- [x] Home widget is behind auth (inside (main) layout)
- [x] No `dangerouslySetInnerHTML` on either surface
- [x] Recipe data sanitized through Mongoose schema (existing)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Voting page loaded | info | `{ token, menuStatus }` (NO user data) |
| Vote submitted | info | `{ menuId, candidateCount }` (NO fingerprint) |
| Vote replaced | info | `{ menuId }` |
| Voting page: token not found | warn | `{ token }` |
| Home widget rendered | debug | `{ weekNumber, dayCount }` |

### Traces

| Span | Attributes |
|------|------------|
| `vote.page.load` | `menuStatus` |
| `vote.submit` | `candidateCount`, `isReplacement` |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `fingerprint.ts` | Consistent hash output, handles missing APIs gracefully |
| `recipe-candidate.tsx` | Toggle selection state, visual ring |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Vote submission | Tap candidates → enter name → submit → API call |
| Vote replacement | Submit twice from same fingerprint → only one vote exists |
| Voting closed state | Locked-in menu renders VotingClosed |

### Manual Verification

| Check | Expected |
|-------|----------|
| /vote/[token] loads without sign-in | Page renders, no auth redirect |
| Tap candidates toggles selection ring | Visual feedback immediate |
| Submit vote with name | API returns success, confirmation shown |
| Reopen same link | Previous selections highlighted, name pre-filled |
| /vote/[token] with locked-in menu | VotingClosed view rendered |
| /vote/[invalid] | 404 not found |
| /recipes with locked-in menu | Home widget appears above grid |
| /recipes without locked-in menu | No widget, grid takes full space |
| Tap recipe in widget | Navigates to /recipes/[slug] |
| Today highlighted in widget | Pink background on current day |
| `npm run lint` | Zero errors |
| `npm run typecheck` | Zero errors |

---

## Alternatives Considered

### Voter Identification: IP Address
- **Pros**: Simpler, server-side
- **Cons**: Family members share the same IP on home WiFi, so every vote would overwrite the last one
- **Why rejected**: Defeats the purpose of household voting

### Voter Identification: Local Storage Token
- **Pros**: Persistent, simple
- **Cons**: Cleared by "clear browsing data", private/incognito gets a new token each time
- **Why rejected**: Browser fingerprint is more stable across sessions

### Voter Identification: Browser Fingerprint (Selected)
- **Pros**: Stable across sessions, no storage needed, different per browser/device, good enough for a family poll
- **Cons**: Not cryptographically unique, can be spoofed
- **Why selected**: Right level of friction for the use case. This is a family dinner poll, not an election.

---

## Open Design Questions

- [x] None remaining
