# PR-035: MongoDB-Primary Recipe API - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-02-04
> **Author**: Claude Code

---

## Overview

Update the web API routes (`/api/recipes` and `/api/recipes/[slug]`) to use the MongoDB repository functions instead of filesystem operations. This aligns the web API with the MCP tools and enables recipe editing in production.

---

## Architecture

### Current State (Broken)

```
Web App Edit → PUT /api/recipes/[slug] → writeRawCooklangContent() → FILESYSTEM
                                                                      ↓
                                                            ❌ FAILS ON VERCEL
                                                            (read-only filesystem)

MCP Tool    → recipe_update            → updateRecipe()    → MongoDB ✓
```

### Target State

```
Web App Edit → PUT /api/recipes/[slug] → updateRecipe()    → MongoDB ✓
Web App New  → POST /api/recipes       → createRecipe()    → MongoDB ✓
Web App Del  → DELETE /api/recipes/[slug] → deleteRecipe() → MongoDB ✓

MCP Tools    → recipe_*                → repository.ts     → MongoDB ✓
```

### Data Flow

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Web App    │────▶│   API Routes      │────▶│   Repository    │
│   (Editor)   │     │   /api/recipes/*  │     │   repository.ts │
└──────────────┘     └───────────────────┘     └────────┬────────┘
                                                        │
┌──────────────┐     ┌───────────────────┐              │
│   MCP Client │────▶│   MCP Tools       │──────────────┘
│   (Claude)   │     │   recipes.ts      │              │
└──────────────┘     └───────────────────┘              ▼
                                               ┌─────────────────┐
                                               │    MongoDB      │
                                               │  (Source of     │
                                               │   Truth)        │
                                               └─────────────────┘
```

---

## File Changes

### Modified Files

| File | Change |
|------|--------|
| `src/app/api/recipes/route.ts` | Use `createRecipe()` from repository instead of `writeRawCooklangContent()` |
| `src/app/api/recipes/[slug]/route.ts` | Use `updateRecipe()` and `deleteRecipe()` from repository |

### No New Files

This PR modifies existing files only.

---

## API Changes

### POST /api/recipes (Create)

**Before**: Writes to filesystem via `writeRawCooklangContent()`
**After**: Saves to MongoDB via `createRecipe()`

**Request** (unchanged):
```typescript
interface CreateRecipeRequest {
  content: string;  // Raw Cooklang content
  category: string; // e.g., "entrees"
}
```

**Response** (unchanged):
```typescript
interface CreateRecipeResponse {
  success: boolean;
  slug: string;
}
```

**Error codes**:
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid content or category |
| 401 | UNAUTHORIZED | No session |
| 409 | DUPLICATE_SLUG | Recipe with same slug exists |
| 500 | INTERNAL_ERROR | Database error |

### PUT /api/recipes/[slug] (Update)

**Before**: Writes to filesystem, manually handles slug changes
**After**: Uses `updateRecipe()` which handles slug changes automatically

**Request** (unchanged):
```typescript
interface UpdateRecipeRequest {
  content: string;
  category: string;
}
```

**Response** (unchanged):
```typescript
interface UpdateRecipeResponse {
  success: boolean;
  slug: string; // May differ from original if title changed
}
```

### DELETE /api/recipes/[slug] (Delete)

**Before**: Uses `deleteRecipeFile()` (filesystem)
**After**: Uses `deleteRecipe()` from repository

**Response**:
```typescript
interface DeleteRecipeResponse {
  success: boolean;
}
```

---

## Implementation Details

### POST /api/recipes

Replace:
```typescript
import { recipeFileExists, writeRawCooklangContent } from '@/lib/recipes/writer';
```

With:
```typescript
import { createRecipe } from '@/lib/recipes/repository';
```

Replace the create logic:
```typescript
// OLD:
const exists = await recipeFileExists(slug, category);
if (exists) {
  return Response.json({ error: '...' }, { status: HTTP_CONFLICT });
}
await writeRawCooklangContent(content, category, slug);
return Response.json({ success: true, slug });

// NEW:
const result = await createRecipe(content, category, 'api');
if (!result.success) {
  const status = result.code === 'DUPLICATE_SLUG' ? HTTP_CONFLICT : HTTP_BAD_REQUEST;
  return Response.json({ error: result.error }, { status });
}
return Response.json({ success: true, slug: result.slug });
```

### PUT /api/recipes/[slug]

Replace:
```typescript
import { getRawCooklangContent } from '@/lib/recipes/loader';
import { deleteRecipeFile, writeRawCooklangContent } from '@/lib/recipes/writer';
```

With:
```typescript
import { updateRecipe, getRecipeBySlug } from '@/lib/recipes/repository';
```

Simplify the update logic:
```typescript
// OLD: Manual file handling with relocation logic
const existingRecipe = await getRawCooklangContent(originalSlug);
// ... validation ...
await handleRecipeRelocation(originalSlug, newSlug, category, existingRecipe);
await writeRawCooklangContent(content, category, newSlug);

// NEW: Repository handles everything
const result = await updateRecipe(originalSlug, content, category);
if (!result.success) {
  const status = result.code === 'NOT_FOUND' ? HTTP_NOT_FOUND : HTTP_BAD_REQUEST;
  return Response.json({ error: result.error }, { status });
}
return Response.json({ success: true, slug: result.slug });
```

### DELETE /api/recipes/[slug]

Add DELETE handler using:
```typescript
import { deleteRecipe } from '@/lib/recipes/repository';

export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  // ... auth check ...
  const result = await deleteRecipe(slug);
  if (!result.success) {
    return Response.json({ error: result.error }, { status: HTTP_NOT_FOUND });
  }
  return Response.json({ success: true });
}
```

---

## Loader Changes

The recipe loader (`src/lib/recipes/loader.ts`) currently reads from the filesystem. It needs to be updated to read from MongoDB instead, or we use the repository functions directly.

Check if `getRawCooklangContent` in `loader.ts` needs updating - it should read from MongoDB's `rawCooklang` field.

---

## Security Considerations

- [x] Auth required for all write operations (unchanged)
- [x] Input validation preserved (Cooklang parsing validates content)
- [x] No new user input vectors
- [x] Uses existing Mongoose models (NoSQL injection protected)

---

## Observability

Existing logging in repository functions is sufficient. No new logging needed.

---

## Testing Strategy

### Manual Verification

1. Create new recipe via web app → saves to MongoDB
2. Edit existing recipe → updates MongoDB
3. Change recipe title → slug updates correctly
4. Try duplicate title → error shown
5. Verify MCP tools still work (no regression)

---

## Alternatives Considered

### Option A: Git-based commits
- **Pros**: Maintains git as source of truth
- **Cons**: Complex, requires GitHub integration, latency
- **Why rejected**: Over-engineered for the use case

### Option B: MongoDB-primary (Selected)
- **Pros**: Simple, works on Vercel, aligns with MCP tools
- **Cons**: Git becomes manual export only
- **Why selected**: Pragmatic, user explicitly confirmed this approach

---

## Open Design Questions

None - approach confirmed by user.
