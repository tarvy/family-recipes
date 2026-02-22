# PR-042: Design — Back Button on Recipe Detail Page

## Approach: `from=browse` query param

Recipe cards append `?from=browse` to their link href. The recipe detail page reads this param and conditionally renders a back arrow that calls `router.back()`.

- Recipe card link: `/recipes/{slug}?from=browse`
- Global search modal navigates without `from=browse` (no change needed)
- Direct links / bookmarks have no `from` param
- Back button only renders when `from=browse` is present

Stateless — no context providers or sessionStorage needed.

## Files Changed

| File | Change |
|------|--------|
| `src/components/recipes/recipe-card.tsx` | Add `?from=browse` to card Link href |
| `src/components/media/icons.tsx` | Add `ArrowLeftIcon` using StrokeIcon pattern |
| `src/components/recipes/recipe-back-button.tsx` | NEW — client component with back arrow + `router.back()` |
| `src/app/(main)/recipes/[slug]/page.tsx` | Read `from` searchParam, conditionally render BackButton |
| `scripts/deliverables.yaml` | Add PR-042 entry |
