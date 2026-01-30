# PR-030: Add `recipe_update` MCP Tool - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-01-30
> **Author**: Claude Code

---

## Overview

Add a `recipe_update` MCP tool that updates existing recipes. Handles content changes, slug changes (when title changes), and category moves (file relocation).

---

## Architecture

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Client   │────▶│ recipe_update│────▶│   Writer     │
│              │     │   MCP Tool   │     │   Library    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌──────────┐       ┌──────────┐        ┌──────────┐
  │ Validate │       │  Parse   │        │  Write/  │
  │ Exists   │       │ New Slug │        │  Delete  │
  └──────────┘       └──────────┘        └──────────┘
```

### Process Steps

1. Validate OAuth token has `recipes:write` scope
2. Check recipe exists via `getRawCooklangContent()`
3. Validate new category if provided
4. Parse new content to get new slug
5. Handle three scenarios:
   - **Same slug, same category**: Overwrite file
   - **Different slug**: Delete old, write new
   - **Different category**: Delete old location, write new location
6. Return `{ success: true, slug: newSlug }`

---

## API Design

### Tool: `recipe_update`

**Input Schema**:
```typescript
{
  slug: z.string().describe('Current recipe slug'),
  content: z.string().describe('New Cooklang content'),
  category: z.string().describe('Target category'),
}
```

**Output Schema**:
```typescript
{
  success: z.boolean(),
  slug: z.string().optional(),  // New slug (may differ from input)
  error: z.string().optional(),
}
```

**Required Scope**: `recipes:write`

---

## Code Changes

### `src/lib/oauth/types.ts`

Add to TOOL_SCOPES:
```typescript
recipe_update: ['recipes:write'],
```

### `src/mcp/tools/recipes.ts`

```typescript
server.registerTool(
  'recipe_update',
  {
    title: 'Update recipe',
    description: 'Update an existing recipe.',
    inputSchema: { /* ... */ },
    outputSchema: { /* ... */ },
  },
  async ({ slug, content, category }) => {
    // 1. Check exists
    const existing = await getRawCooklangContent(slug);
    if (!existing) {
      return buildToolResult({ success: false, error: 'Recipe not found' });
    }

    // 2. Validate category
    const validCategories = getCategories();
    if (!validCategories.includes(category)) {
      return buildToolResult({ success: false, error: 'Invalid category' });
    }

    // 3. Parse new content for slug
    const parsed = await parseCooklang(content, { filePath: 'update', gitCommitHash: 'mcp' });
    if (!parsed.success) {
      return buildToolResult({ success: false, error: 'Invalid Cooklang content' });
    }
    const newSlug = parsed.recipe.slug;

    // 4. Check for collision if slug changes
    if (newSlug !== slug) {
      const collision = await getRawCooklangContent(newSlug);
      if (collision) {
        return buildToolResult({ success: false, error: 'Recipe with new slug already exists' });
      }
    }

    // 5. Delete old if slug or category changed
    if (newSlug !== slug || category !== existing.category) {
      await deleteRecipeFile(slug, existing.category);
    }

    // 6. Write new
    await writeRawCooklangContent(content, category, newSlug);

    return buildToolResult({ success: true, slug: newSlug });
  },
);
```

---

## File Structure

```
src/
├── lib/
│   └── oauth/
│       └── types.ts  ← Add TOOL_SCOPES entry
└── mcp/
    └── tools/
        └── recipes.ts  ← Add recipe_update tool
```

---

## Security Considerations

- [x] Existence check prevents blind overwrites
- [x] Slug collision check prevents data loss
- [x] Category validation prevents path traversal
- [x] Requires `recipes:write` scope

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Recipe updated | info | oldSlug, newSlug, category |
| Slug changed | info | oldSlug, newSlug |
| Category changed | info | oldCategory, newCategory |
| Recipe not found | warn | slug |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Slug changes | Delete old file, create new |
| Category changes | Delete from old category, write to new |
| Both change | Delete old, write to new location with new slug |
| Collision on rename | Fail with error |
| Recipe doesn't exist | Fail with error |
