# PR-058: Impeccable Design System Foundation - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-08-07
> **Author**: Cursor Cloud Agent

---

## Overview

Install Impeccable, capture product truth (`PRODUCT.md`), document the incumbent cozy-kitchen visual system (`DESIGN.md` + sidecar), then harden the code foundation so the system scales: typed tokens, stronger UI primitives, iOS safe areas, and semantic success colors. Preserve the existing Cooking Mama / Grandma’s kitchen identity — do not invent a new brand world.

---

## Architecture

```
Impeccable install (.cursor/.claude/.github skills)
        │
        ▼
PRODUCT.md  ──►  DESIGN.md + .impeccable/design.json
        │
        ▼
src/lib/design-system/     (typed constants, mobile rules)
src/app/globals.css        (tokens + safe-area utilities)
src/components/ui/         (Button, Card, Input, Badge, PageShell, EmptyState)
docs/DESIGN_SYSTEM.md      (agent/human how-to)
```

### Authority order

1. `PRODUCT.md` — who/what/why (non-visual)
2. `DESIGN.md` — visual world + frontmatter tokens
3. `src/app/globals.css` `@theme` — runtime CSS source of truth
4. `src/lib/design-system` — TypeScript constants mirroring CSS for layout math
5. `src/components/ui` — only approved primitives for new UI

---

## Implementation Plan

### Phase 1 — Impeccable context

- `PRODUCT.md` (init; inferred where interview unavailable; labeled)
- `DESIGN.md` + `.impeccable/design.json` (document scan mode)

### Phase 2 — Token & mobile foundation

- Expand `@theme` with `success` semantic colors, spacing scale aliases if needed
- CSS utilities: `pt-safe`, `pb-safe`, `safe-area-pad-*`
- `viewportFit: 'cover'` in root layout
- Align `manifest.json` `background_color` to gingham `#FBF6E3`
- `MIN_TOUCH_TARGET_SIZE_PX = 44`
- Header / MainLayout / bottom banners / cooking panel respect safe areas

### Phase 3 — UI kit expansion

| Component | Purpose |
|-----------|---------|
| `Button` | 44px min height defaults; keep variants |
| `Badge` | Filter/status pills |
| `PageShell` | Consistent page padding + max-width |
| `EmptyState` | Cohesive empty messaging |

### Phase 4 — Cohesion patches

- `update-prompt.tsx`: `bg-sunny` → `bg-accent`
- `recipe-grid.tsx`: gray → muted tokens
- Cooking timer success greens → `success` semantic tokens
- Authorize success + media upload success → semantic success

### Phase 5 — Docs & deliverables

- `docs/DESIGN_SYSTEM.md` linked from README
- Register PR-058 in `scripts/deliverables.yaml`

---

## Mobile / iOS Rules (normative)

| Rule | Value |
|------|-------|
| Min touch target | 44×44 CSS px |
| Header content height | 56px + `safe-area-inset-top` |
| Bottom fixed chrome | pad with `safe-area-inset-bottom` |
| Viewport | `viewport-fit=cover` |
| Breakpoint mobile nav | 768px (`md`) |
| Primary device | iPhone Safari / Add to Home Screen PWA |

---

## Observability

No new API routes. UI-only + docs. Logging not required for pure presentational primitives.

---

## Testing Strategy

| Check | Expected |
|-------|----------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| Visual: iPhone-width viewport | Header/content clear of notch; bottom banners clear of home indicator |
| Button default | ≥44px tall |
| PRODUCT.md / DESIGN.md | Present and schema-valid structure |
