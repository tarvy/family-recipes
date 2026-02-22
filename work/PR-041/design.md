# PR-041: Fix MCP Recipe CRUD Bugs - Technical Design

## Root Causes

### Bug 1 & 2: Broken title/slug in `recipe_create`

`repository.ts:319` hardcodes `'new-recipe'` as the placeholder slug:
```typescript
const filePath = buildFilePath(category, 'new-recipe');
```

This creates filePath `"desserts/new-recipe.cook"`. When `parseCooklang` falls back (no title in metadata), `generateSlug("desserts/new-recipe.cook")` strips `/` and concatenates → `"dessertsnew-recipe"`.

### Bug 3: `recipe_update` compounds slug

`repository.ts:413` passes `buildFilePath(category, slug)` to parser. The parser's `generateSlug` processes the full path, prepending category each time.

### Bug 4: `recipe_get` validation error

`recipeDetailSchema` in `recipes.ts:41` requires `category: z.string()`, but `recipe_get` returns raw `IRecipeDocument` which may have `category: undefined`. Zod rejects it.

### Bug 5: No title override

`recipe_create` only accepts `content` + `category`. No way to specify title if frontmatter parsing fails.

## Fixes

### Fix 1: Slug generation in parser (`parser.ts`)

Change `generateSlug` to only process the filename, not the full path:
```typescript
const slug = generateSlug(metadata[METADATA_KEYS.TITLE] || titleFromFilePath(context.filePath));
```

This ensures:
- If title metadata exists → slug from title
- If no title → slug from filename only (not full path with category)

### Fix 2: `createRecipe` placeholder (`repository.ts`)

Use a proper placeholder that won't leak into the final slug. After parsing, the slug comes from the title metadata or filename — the placeholder filePath is only used as context for the parser.

Better: parse first with a minimal context, then build the real filePath from the result:
```typescript
const filePath = buildFilePath(category, 'new-recipe');
const parseResult = await parseCooklang(content, { filePath, gitCommitHash: source });
```

With Fix 1 applied, even if the fallback fires, `titleFromFilePath("desserts/new-recipe.cook")` returns `"new recipe"` and `generateSlug("new recipe")` returns `"new-recipe"` — no category contamination.

### Fix 3: `recipe_get` schema (`recipes.ts`)

Change the output schema to make category optional:
```typescript
category: z.string().optional(),
```

Or better: use `getRecipeDetail()` instead of `getRecipeBySlug()` so the `toRecipeDetail()` function handles the category fallback (`doc.category ?? extractCategory(doc.filePath)`).

### Fix 4: No title override (not fixing in this PR)

This is a feature request, not a bug. The real fix is ensuring title extraction from Cooklang metadata works reliably (Fix 1).

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/cooklang/parser.ts` | Fix `generateSlug` input to use filename, not full path |
| `src/mcp/tools/recipes.ts` | Make `category` optional in `recipeDetailSchema`, use `getRecipeDetail()` |
