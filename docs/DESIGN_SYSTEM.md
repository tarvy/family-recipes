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

1. Run `node .cursor/skills/impeccable/scripts/context.mjs` (or read `PRODUCT.md` + `DESIGN.md`).
2. Compose from `@/components/ui`: `Button`, `Card`, `Input`, `Badge`, `PageShell`, `EmptyState`, `FormField`, `Alert`.
3. Wrap authenticated pages in `PageShell` (width: `auth` | `reading` | `detail` | `browse`).
4. Use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-success-soft`, `bg-warning-soft`) — never raw `gray-*` / default `green-*`.
5. Keep controls ≥ **44×44** (`min-h-touch` / `size-touch`).
6. Keep actions content-width by default; use `fullWidth` only for primary CTAs in narrow stacks.
7. Pad fixed chrome with `pt-safe` / `pb-safe`.

```tsx
import { Alert, Button, EmptyState, FormField, Input, PageShell } from '@/components/ui';

export function ExamplePage() {
  return (
    <PageShell width="browse">
      <h1 className="text-3xl font-semibold">Recipes</h1>
      <EmptyState title="Nothing here yet" description="Add your first family recipe." />
      <FormField label="Title" htmlFor="title">
        <Input id="title" name="title" />
      </FormField>
      <Alert variant="success">Saved.</Alert>
      <Button type="button">Add recipe</Button>
    </PageShell>
  );
}
```

## Surfaces

1. **Page** — gingham tablecloth (`bg-background`)
2. **Card** — white island (`bg-card` + `shadow-sm` + `ring-1 ring-border`; add your own padding)
3. **Nested** — inset panels (`bg-card-nested`)

## Architecture rules (hardened)

| Rule | Meaning |
|------|---------|
| Content-Width Action | Buttons are `w-fit` unless `fullWidth` |
| Single token lane | Layout constants from `@/lib/design-system`; colors from `@theme` |
| Compose, don’t fork | Domain pills (e.g. menu StatusBadge) wrap `Badge` |
| Page chrome | Main routes use `PageShell` |
| Status banners | Use `Alert`, not one-off destructive boxes |

## Follow-ups (not all done in PR-062)

- Migrate remaining raw `<button>` call sites to `Button`
- Adopt `EmptyState` / `FormField` / `Alert` across shopping, cooking, auth
- Raise sub-44px icon controls in cooking-session / recipe-selector

## Mobile / iOS

- Primary runtime: iPhone Safari / Add to Home Screen PWA
- Header: 56px + `safe-area-inset-top`
- Drawer: 280px; hamburger below `md` (768px)
- No bottom tab bar without a product decision

## Impeccable

```bash
npx impeccable install   # other harnesses
node .cursor/skills/impeccable/scripts/context.mjs
```

| Command | Use |
|---------|-----|
| `/impeccable document` | Refresh `DESIGN.md` after drift |
| `/impeccable extract` | Pull repeated patterns into the kit |
| `/impeccable adapt` | Responsive / device pass |
| `/impeccable audit` | A11y / quality scan |
| `/impeccable polish` | Final visual pass |

## Do not

- Introduce Inter/Roboto, purple SaaS gradients, or dark-mode-first skins
- Nest decorative cards inside cards
- Place controls under the notch or home indicator
- Stretch destructive/secondary actions across wide cards
- Treat scalloped/lace ornaments as required
