# PR-050: Role-Based Access Control & Public Recipe Sharing - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-03-05
> **Author**: Claude Code (Sisyphus)

---

## Overview

Add role-based authorization guards to API routes and frontend components so that `friend` role users are read-only (except rating/cook log). Create a new `/r/[slug]` public route for anonymous recipe viewing with zero interactive features and maximum security hardening.

---

## Architecture

### Access Control Matrix

```
                     owner    family    friend    anonymous
Create recipe         Y         Y         N          N
Edit recipe           Y         Y         N          N
Delete recipe         Y         Y         N          N
Upload photo          Y         Y         N          N
Rate recipe           Y         Y         Y          N
Log cook              Y         Y         Y          N
Pin recipe            Y         Y         Y          N
Shopping list         Y         Y         N          N
Browse recipes        Y         Y         Y          N
View recipe           Y         Y         Y          Y (via /r/[slug] only)
```

### Authorization Helper

New utility: `src/lib/auth/authorization.ts`

```typescript
/** Roles that have write access to recipes and shopping lists */
const FAMILY_ROLES: ReadonlySet<UserRole> = new Set(['owner', 'family']);

/** Check if a user role has family-level (write) access */
export function isFamilyRole(role: UserRole): boolean {
  return FAMILY_ROLES.has(role);
}
```

### Data Flow: API Role Guard

```
Request → getSessionFromCookies() → user.role check → isFamilyRole()?
  Yes → proceed with handler
  No  → Response.json({ error: 'forbidden' }, { status: 403 })
```

### Data Flow: Public Recipe Route

```
GET /r/[slug]
  → No auth check (outside (main) route group)
  → getRecipeDetail(slug) from MongoDB
  → Render stripped-down server component (NO client components)
  → No cookies read, no session checked, no user data in output
```

---

## Database Changes

None. Existing schema supports this fully.

---

## API Changes

### Routes Getting Role Guards (add `friend` rejection)

| Route | Method | Guard Logic |
|-------|--------|-------------|
| `/api/recipes` | POST | `if (!isFamilyRole(user.role)) return 403` |
| `/api/recipes/[slug]` | PUT | `if (!isFamilyRole(user.role)) return 403` |
| `/api/photos/upload` | POST | `if (!isFamilyRole(user.role)) return 403` |
| `/api/shopping-list` | POST | `if (!isFamilyRole(user.role)) return 403` |
| `/api/shopping-list/[id]` | GET | `if (!isFamilyRole(user.role)) return 403` |
| `/api/shopping-list/[id]` | PATCH | `if (!isFamilyRole(user.role)) return 403` |
| `/api/shopping-list/[id]` | DELETE | `if (!isFamilyRole(user.role)) return 403` |

### Routes Staying Open (auth required, any role)

| Route | Method | Reason |
|-------|--------|--------|
| `/api/recipes/[slug]/rate` | POST | Account presence sufficient |
| `/api/recipes/[slug]/cook-log` | POST | Account presence sufficient |

### Existing Correct Guards (no change)

| Route | Method | Current Guard |
|-------|--------|---------------|
| `/api/recipes/[slug]` | DELETE | `friend` blocked (already correct) |
| `/api/admin/allowlist` | GET/POST | `owner` only (already correct) |
| `/api/invite` | POST | `owner`/`family` only (already correct) |

---

## UI Changes

### Recipe Pages

1. **Recipe detail page** (`src/app/(main)/recipes/[slug]/page.tsx`):
   - Compute `isFamily = isFamilyRole(user.role)` alongside existing `canDelete`
   - Pass `isFamily` to `RecipeActions` component

2. **Recipes list page** (`src/app/(main)/recipes/page.tsx`):
   - Same `isFamily` computation, pass through to grid components

3. **Recipe action menu** (`src/components/recipes/recipe-action-menu.tsx`):
   - Accept `isFamily` prop
   - Conditionally render Edit link (family only)
   - Conditionally render Cover Photo button (family only)
   - Pin stays visible for all authenticated users

4. **Create recipe page** (`src/app/(main)/recipes/new/page.tsx`):
   - Add server-side role check: redirect non-family to `/recipes`

5. **Edit recipe page** (`src/app/(main)/recipes/[slug]/edit/page.tsx`):
   - Add server-side role check: redirect non-family to `/recipes/[slug]`

### Navigation

6. **Nav links** (`src/components/navigation/nav-links.tsx`):
   - Make NAV_LINKS role-aware: filter out Shopping List for friend role
   - This requires passing user role to the client — via a lightweight context or prop

### Shopping List Page

7. **Shopping list page** (`src/app/(main)/shopping-list/page.tsx`):
   - Add server-side role check: redirect non-family to `/recipes`

---

## New Route: `/r/[slug]`

### File Structure

```
src/app/r/[slug]/page.tsx       # Server component, public recipe view
```

### Security Requirements

- Route is OUTSIDE `(main)` group — no layout auth check
- Route is OUTSIDE middleware protected paths — no cookie check
- Page is a pure Server Component — no client JS for interactions
- No `getSessionFromCookies()` call — no cookie reading
- No user-specific data in rendered HTML
- No API calls requiring auth from the page
- Minimal metadata: recipe title + description only
- No navigation header/drawer (standalone page)
- No links to authenticated routes

### Component Design

```
PublicRecipePage (Server Component)
├── Recipe title + category badge
├── Description (if present)
├── Meta row (prep/cook/total time, servings)
├── Tags
├── Ingredients list (static)
├── Steps list (static, no interactive timers)
├── Footer meta (cuisine, course, difficulty)
└── Minimal branding footer
```

---

## File Structure

```
src/
├── app/
│   ├── r/
│   │   └── [slug]/
│   │       └── page.tsx            # NEW: Public recipe page
│   └── (main)/
│       ├── recipes/
│       │   ├── [slug]/page.tsx     # MODIFIED: Add isFamily prop
│       │   ├── new/page.tsx        # MODIFIED: Add role gate
│       │   └── page.tsx            # MODIFIED: Add isFamily prop
│       └── shopping-list/
│           └── page.tsx            # MODIFIED: Add role gate
├── components/
│   ├── navigation/
│   │   ├── nav-links.tsx           # MODIFIED: Role-aware links
│   │   └── nav-drawer.tsx          # MODIFIED: Accept/pass role
│   └── recipes/
│       ├── recipe-action-menu.tsx  # MODIFIED: Accept isFamily prop
│       └── recipe-actions.tsx      # MODIFIED: Accept/pass isFamily prop
├── lib/
│   └── auth/
│       └── authorization.ts        # NEW: isFamilyRole helper
└── app/api/
    ├── recipes/
    │   ├── route.ts                # MODIFIED: Add role guard on POST
    │   └── [slug]/route.ts         # MODIFIED: Add role guard on PUT
    ├── photos/
    │   └── upload/route.ts         # MODIFIED: Add role guard
    └── shopping-list/
        ├── route.ts                # MODIFIED: Add role guard
        └── [id]/route.ts           # MODIFIED: Add role guard on all methods
```

---

## Dependencies

### New Packages

None required.

---

## Security Considerations

- [x] Role checks enforced at API layer (server-side, not just UI hiding)
- [x] Public route reads no cookies and exposes no user data
- [x] Public route is pure Server Component (no client JS attack surface)
- [x] Public route excluded from middleware matcher (no session cookie sent)
- [x] No `dangerouslySetInnerHTML` on public page
- [x] Recipe data sanitized through Mongoose schema (existing)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Friend blocked from write op | warn | `{ userId, role, endpoint }` |
| Public recipe viewed | info | `{ slug }` (NO user data) |

---

## Testing Strategy

### Manual Verification

| Check | Expected |
|-------|----------|
| Friend role → POST /api/recipes | 403 |
| Friend role → PUT /api/recipes/[slug] | 403 |
| Friend role → POST /api/photos/upload | 403 |
| Friend role → POST /api/shopping-list | 403 |
| Friend role → all shopping-list/[id] methods | 403 |
| Friend role → POST /api/recipes/[slug]/rate | 200 (allowed) |
| Friend role → POST /api/recipes/[slug]/cook-log | 200 (allowed) |
| Family role → all above endpoints | 200 (allowed) |
| Anonymous → GET /r/[slug] | 200 (recipe rendered) |
| Anonymous → GET /r/nonexistent | 404 page |
| /r/[slug] page source has no user data | Verified |
| /r/[slug] has no auth cookies in requests | Verified |
| Friend UI → no Edit/Cover Photo/Delete in menu | Verified |
| Friend UI → no Shopping List in nav | Verified |
| Friend UI → /recipes/new redirects | Verified |
