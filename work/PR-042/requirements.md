# PR-042: Back Button on Recipe Detail Page

## Problem

When users browse recipes on `/recipes` with search/category filters active, click into a recipe detail page, then want to return — there's no back button. They lose their scroll position and filter state.

## User Stories

### Back navigation from browse

**Given** I am browsing recipes with filters applied (e.g., `/recipes?q=pasta&category=entrees`)
**When** I click a recipe card to view details
**Then** a back arrow appears on the recipe detail page
**And** clicking it returns me to the recipes page with my filters and scroll position preserved

### No back button from direct navigation

**Given** I open a recipe via direct URL, bookmark, or global search (Cmd+K)
**When** I view the recipe detail page
**Then** no back arrow is displayed

## Acceptance Criteria

- [ ] Recipe cards on `/recipes` link to `/recipes/{slug}?from=browse`
- [ ] Recipe detail page reads `from` searchParam
- [ ] Back arrow renders only when `from=browse` is present
- [ ] Back arrow calls `router.back()` to preserve filter state and scroll position
- [ ] Global search (Cmd+K) navigation does NOT trigger the back arrow
- [ ] `ArrowLeftIcon` added to shared icons using `StrokeIcon` pattern
- [ ] `npm run typecheck && npm run lint` pass clean
