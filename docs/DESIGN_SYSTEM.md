# Design System

Family Recipes uses an Impeccable-backed design system so humans and AI agents ship cohesive, iPhone-first UI.

## Authority

| File | Role |
|------|------|
| [`PRODUCT.md`](../PRODUCT.md) | Product truth (users, purpose, constraints) — non-visual |
| [`DESIGN.md`](../DESIGN.md) | Visual world + machine-readable tokens (frontmatter) |
| [`.impeccable/design.json`](../.impeccable/design.json) | Sidecar: motion, shadows, breakpoints, component snippets |
| [`src/app/globals.css`](../src/app/globals.css) | Runtime CSS `@theme` tokens (source of truth for Tailwind) |
| [`src/lib/design-system/`](../src/lib/design-system/) | TypeScript mirrors for layout math / touch targets |
| [`src/components/ui/`](../src/components/ui/) | Shared primitives |

**Creative North Star:** “Grandma's Cozy Kitchen Table”

## Quick start for new UI

1. Read `PRODUCT.md` + `DESIGN.md` (or run `node .cursor/skills/impeccable/scripts/context.mjs`).
2. Compose from `@/components/ui` (`Button`, `Card`, `Input`, `Badge`, `PageShell`, `EmptyState`).
3. Use semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, `bg-success-soft`) — never raw `gray-*` / default `green-*`.
4. Keep primary controls ≥ **44×44** (`min-h-touch` / `size-touch`).
5. Pad fixed top/bottom chrome with `pt-safe` / `pb-safe` (requires `viewport-fit=cover`).

```tsx
import { Button, EmptyState, PageShell } from '@/components/ui';

export function ExamplePage() {
  return (
    <PageShell width="browse">
      <h1 className="text-3xl font-semibold">Recipes</h1>
      <EmptyState title="Nothing here yet" description="Add your first family recipe." />
      <Button type="button">Add recipe</Button>
    </PageShell>
  );
}
```

## Surfaces

1. **Page** — gingham tablecloth (`bg-background`)
2. **Card** — white island (`bg-card` + `shadow-sm` + `ring-1 ring-border`)
3. **Nested** — inset panels (`bg-card-nested`)

## Mobile / iOS

- Primary runtime: iPhone Safari / Add to Home Screen PWA
- Header content height: 56px + `safe-area-inset-top`
- Bottom banners / cooking panel: `pb-safe`
- Drawer width: 280px; hamburger below `md` (768px)
- No bottom tab bar (current system) — do not invent one without a product decision

## Impeccable commands

Cursor skills are committed under `.cursor/skills/impeccable/`. For Claude Code or GitHub Copilot, run from the repo root:

```bash
npx impeccable install
```

Useful follow-ups:

| Command | Use |
|---------|-----|
| `/impeccable document` | Refresh `DESIGN.md` after visual drift |
| `/impeccable extract` | Pull repeated patterns into the kit |
| `/impeccable adapt` | Responsive / device pass |
| `/impeccable audit` | A11y / quality scan |
| `/impeccable polish` | Final visual pass on a page |

CLI detector: `npx impeccable detect src/`

## Do not

- Introduce Inter/Roboto, purple SaaS gradients, or dark-mode-first skins
- Nest decorative cards inside cards
- Place controls under the notch or home indicator
- Treat scalloped/lace ornaments as required (optional future garnish only)
