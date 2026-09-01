# PR-062: Design System Index + Architecture Harden - Design

## Approach

1. **`/impeccable document` (scan refresh)** — Rewrite DESIGN.md + `.impeccable/design.json` from live `globals.css` + `src/components/ui`, keeping Creative North Star “Grandma's Cozy Kitchen Table”.
2. **Token architecture** — Expand TS mirrors; dedupe touch/breakpoint constants through `@/lib/design-system`.
3. **Primitives** — `Button` content-width + `fullWidth`; `FormField` + `Alert`; StatusBadge wraps `Badge`.
4. **Adoption** — `PageShell` on main routes (recipes, menu, shopping, settings).
5. **Docs** — Honest `docs/DESIGN_SYSTEM.md` (what’s required vs follow-up migrations).

## Out of scope this PR

Full raw-button migration (~74 call sites) — tracked as follow-up `/impeccable extract`.
