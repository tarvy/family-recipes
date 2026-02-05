# PR-036: Active Cooking Timers - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-04
> **Author**: Claude Code

---

## Overview

Add interactive cooking timers to the recipe app, allowing users to start countdown timers directly from recipe steps, monitor active timers in a persistent bottom panel, and pin recipes for multi-dish cooking sessions. Follows existing codebase patterns (React Context + localStorage for state, fixed-position UI for persistent elements).

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│  Root Layout (layout.tsx)                                       │
│  └── ClientProviders                                            │
│      ├── PWAProvider                                            │
│      ├── NavigationProvider                                     │
│      └── CookingSessionProvider  ◄── NEW                        │
│          ├── Timer state + actions                              │
│          ├── Pinned recipes state                               │
│          └── localStorage persistence                           │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Recipe Detail   │  │ Cooking Session │  │ Any Page        │
│ Page            │  │ Panel           │  │                 │
│ (timer badges)  │  │ (fixed bottom)  │  │ (panel visible) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Component Design

```
src/components/cooking-session/                ◄── NEW DIRECTORY
├── index.ts                                   (exports)
├── types.ts                                   (interfaces)
├── cooking-session-context.tsx                (provider + hook)
├── cooking-session-panel.tsx                  (bottom panel)
├── timer-item.tsx                             (single timer row)
├── timer-badge.tsx                            (clickable badge)
├── pinned-recipe-item.tsx                     (pinned recipe row)
└── timer-complete-toast.tsx                   (completion notification)
```

### Data Flow

```
User clicks timer badge in InteractiveStepList
         │
         ▼
startTimer(params) ──────────► CookingSessionContext
         │
         ├── Generate unique timerId
         ├── Add to activeTimers[]
         ├── Persist to localStorage
         └── Start countdown interval

         │
         ▼
useEffect interval updates remainingMs every second
         │
         ├── Update timer state
         ├── Sync to localStorage
         └── On completion: trigger notification

         │
         ▼
CookingSessionPanel re-renders via context
```

---

## Database Changes

**None** - This feature is entirely client-side using localStorage.

---

## API Design

**None** - No backend API required. All state is device-local.

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CookingSessionProvider` | `src/components/cooking-session/` | Context provider for timers + pins |
| `CookingSessionPanel` | `src/components/cooking-session/` | Fixed bottom panel showing active timers |
| `TimerItem` | `src/components/cooking-session/` | Single timer row with controls |
| `TimerBadge` | `src/components/cooking-session/` | Clickable badge replacing static spans |
| `PinnedRecipeItem` | `src/components/cooking-session/` | Pinned recipe row with link |
| `TimerCompleteToast` | `src/components/cooking-session/` | Completion notification |

### Component Hierarchy

```
ClientProviders
├── PWAProvider
├── NavigationProvider
└── CookingSessionProvider          ◄── NEW
    ├── {children}
    └── CookingSessionPanel         ◄── NEW (fixed position)
        ├── Panel header (collapsed: count badge)
        ├── Timer list
        │   └── TimerItem (per timer)
        │       ├── Timer info
        │       └── Controls (pause/cancel)
        └── Pinned recipes section
            └── PinnedRecipeItem (per pin)

RecipeDetailClient
└── InteractiveStepList
    └── Step
        └── TimerBadge              ◄── NEW (replaces static span)
```

### Panel Layout (Expanded)

```
┌─────────────────────────────────────────────────────────────────┐
│ ▲ Active Cooking Session                      [🔔 on] [✕]      │ Header
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIMERS                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🕐 Simmer sauce • Pasta Primavera            12:34  [⏸][✕]│  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🕐 Bake until golden • Apple Pie             45:12  [⏸][✕]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  PINNED RECIPES                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Pasta Primavera │  │ Apple Pie       │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Management

**Context Pattern** (following NavigationContext):
- `CookingSessionProvider` wraps app at `ClientProviders` level
- `useCookingSession()` hook for accessing state and actions
- Single `setInterval` manages all timer countdowns
- `useEffect` persists state changes to localStorage
- Hydration guard prevents SSR mismatch

---

## File Structure

```
src/
├── components/
│   ├── cooking-session/                       ◄── NEW DIRECTORY
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── cooking-session-context.tsx
│   │   ├── cooking-session-panel.tsx
│   │   ├── timer-item.tsx
│   │   ├── timer-badge.tsx
│   │   ├── pinned-recipe-item.tsx
│   │   └── timer-complete-toast.tsx
│   ├── layout/
│   │   └── client-providers.tsx               (MODIFY: add provider)
│   └── recipes/
│       ├── interactive-step-list.tsx          (MODIFY: use TimerBadge)
│       └── recipe-detail-client.tsx           (MODIFY: add pin button)
├── lib/
│   └── constants/
│       └── navigation.ts                      (MODIFY: add z-index)
└── public/
    └── sounds/
        └── timer-complete.mp3                 (NEW: ~2KB audio file)
```

---

## Type Definitions

```typescript
// src/components/cooking-session/types.ts

/** Timer extracted from Cooklang */
interface TimerDefinition {
  duration: number;
  unit: string;
}

/** Runtime timer state */
interface ActiveTimer {
  id: string;
  recipeSlug: string;
  recipeTitle: string;
  stepIndex: number;
  stepPreview: string;
  originalDurationMs: number;
  remainingMs: number;
  status: 'running' | 'paused' | 'completed';
  startedAt: number;
  pausedAt: number | null;
  label: string;
}

/** Pinned recipe */
interface PinnedRecipe {
  slug: string;
  title: string;
  pinnedAt: number;
}

/** Context value */
interface CookingSessionContextValue {
  activeTimers: ActiveTimer[];
  pinnedRecipes: PinnedRecipe[];

  // Timer actions
  startTimer: (params: StartTimerParams) => string;
  pauseTimer: (timerId: string) => void;
  resumeTimer: (timerId: string) => void;
  cancelTimer: (timerId: string) => void;
  dismissCompletedTimer: (timerId: string) => void;

  // Pin actions
  pinRecipe: (slug: string, title: string) => void;
  unpinRecipe: (slug: string) => void;
  isPinned: (slug: string) => boolean;

  // Panel state
  isPanelExpanded: boolean;
  togglePanel: () => void;

  // Settings
  soundEnabled: boolean;
  toggleSound: () => void;
}
```

---

## Dependencies

### New Packages

None required. All functionality uses native browser APIs.

### Internal Dependencies

- Depends on: `src/lib/constants/navigation.ts` (z-index)
- Depends on: `src/components/layout/client-providers.tsx` (provider tree)
- Used by: `src/components/recipes/interactive-step-list.tsx`

---

## Security Considerations

- [x] No authentication required (device-local feature)
- [x] No user input sent to server
- [x] localStorage data is not sensitive (timer state only)
- [x] No XSS vectors (no dangerouslySetInnerHTML)
- [x] Audio file served from same origin

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Timer started | debug | recipeSlug, stepIndex, duration |
| Timer completed | debug | timerId, recipeSlug |
| Timer cancelled | debug | timerId |

### Traces

None required - client-side only feature.

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `cooking-session-context.tsx` | Timer countdown logic, pause/resume, localStorage sync |
| `timer-badge.tsx` | Click handler, active state display |

### Manual Verification

| Check | Expected |
|-------|----------|
| Start timer from step | Timer appears in panel, countdown begins |
| Multiple timers | All run independently |
| Page navigation | Timers persist |
| Page refresh | Timers resume at correct time |
| Timer completion | Toast appears, optional audio |
| Pause/resume | Time pauses accurately |
| Pin recipe | Appears in panel |
| Mobile (375px) | Panel usable, touch targets adequate |

---

## Rollout Plan

1. [ ] Implement Phase 1 (context + types)
2. [ ] Implement Phase 2 (UI components)
3. [ ] Implement Phase 3 (recipe integration)
4. [ ] Implement Phase 4 (notifications)
5. [ ] Implement Phase 5 (pinned recipes)
6. [ ] Manual verification
7. [ ] Merge to main

---

## Alternatives Considered

### Option A: Server-side timer sync
- **Pros**: Timers work across devices
- **Cons**: Requires auth, adds complexity, latency
- **Why rejected**: Over-engineered for cooking use case

### Option B: localStorage-only (Selected)
- **Pros**: Simple, no auth needed, instant, works offline
- **Cons**: Device-local only
- **Why selected**: Matches shopping list pattern, appropriate for cooking context

### Option C: Service Worker timers
- **Pros**: True background operation
- **Cons**: Complex, browser support varies
- **Why rejected**: Can add later if needed; in-page timers sufficient for MVP

---

## Open Design Questions

- [x] Panel position → Fixed bottom bar
- [x] Timer persistence → localStorage with timestamps
- [x] Audio notification → Optional, user toggle
- [ ] Notification permission → Request on first timer start (lazy)
