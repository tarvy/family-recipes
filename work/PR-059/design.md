# PR-059: Content-Width Actions - Design

## Approach

1. **`Button` default:** add `w-fit shrink-0` so flex parents cannot stretch it.
2. **`fullWidth` prop:** opt-in `w-full` for auth/primary stack CTAs.
3. **DESIGN.md:** “Content-Width Action Rule” — full-bleed only for primary submits in narrow stacks; list-row destructive stays content-sized outline/ghost.
4. **Passkey cards:** polish layout (Badge, humanized errors); keep actions content-sized if/when present.

## Files

- `src/components/ui/button.tsx`
- `DESIGN.md` / `.impeccable/design.json` (narrative rule)
- `docs/DESIGN_SYSTEM.md`
- `src/components/auth/passkey-manager.tsx`
- Call sites that need full width: add `fullWidth` where intentional
