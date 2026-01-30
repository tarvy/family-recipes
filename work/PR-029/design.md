# PR-029: Add `recipe_create` MCP Tool - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-01-30
> **Author**: Claude Code

---

## Overview

Add a `recipe_create` MCP tool that accepts raw Cooklang content and a category, writes the recipe to the filesystem, and returns the generated slug. This enables AI clients to create recipes on behalf of users.

---

## Architecture

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Client   │────▶│ recipe_create│────▶│   Writer     │
│              │     │   MCP Tool   │     │   Library    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │ content, category  │ parse & validate   │ writeRawCooklangContent()
       │                    │                    │
       │                    ▼                    ▼
       │             ┌──────────────┐     ┌──────────────┐
       │             │  Cooklang    │     │  Filesystem  │
       │             │   Parser     │     │   (recipes/) │
       │             └──────────────┘     └──────────────┘
```

### Process Steps

1. Validate OAuth token has `recipes:write` scope
2. Validate category against allowed list
3. Parse Cooklang content to extract title/slug
4. Write file via `writeRawCooklangContent()`
5. Return `{ success: true, slug: string }`

---

## API Design

### Tool: `recipe_create`

**Input Schema**:
```typescript
{
  content: z.string().describe('Raw Cooklang content'),
  category: z.string().describe('Category folder (e.g., "entrees", "desserts")'),
}
```

**Output Schema**:
```typescript
{
  success: z.boolean(),
  slug: z.string().optional(),
  error: z.string().optional(),
}
```

**Required Scope**: `recipes:write`

---

## Code Changes

### `src/lib/oauth/types.ts`

Add to TOOL_SCOPES:
```typescript
export const TOOL_SCOPES: Record<string, OAuthScope[]> = {
  // ... existing entries
  recipe_create: ['recipes:write'],
};
```

### `src/mcp/tools/recipes.ts`

New tool registration:
```typescript
server.registerTool(
  'recipe_create',
  {
    title: 'Create recipe',
    description: 'Create a new recipe from Cooklang content.',
    inputSchema: {
      content: z.string().describe('Raw Cooklang content'),
      category: z.string().describe('Recipe category'),
    },
    outputSchema: {
      success: z.boolean(),
      slug: z.string().optional(),
      error: z.string().optional(),
    },
  },
  async ({ content, category }) => {
    // Implementation
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
        └── recipes.ts  ← Add recipe_create tool
```

---

## Dependencies

### Internal Dependencies

- `src/lib/recipes/writer.ts` - `writeRawCooklangContent()`
- `src/lib/recipes/loader.ts` - `getCategories()` for validation
- `src/lib/cooklang/parser.ts` - `parseCooklang()` for slug extraction

---

## Security Considerations

- [x] Input validation: Category checked against allowed list
- [x] Authorization: Requires `recipes:write` scope
- [x] Path traversal: Category validated, slug derived from parser
- [x] Content validation: Parsed to ensure valid Cooklang

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Recipe created | info | slug, category |
| Invalid category | warn | category provided |
| Parse failure | warn | error message |

---

## Testing Strategy

### Manual Verification

| Check | Expected |
|-------|----------|
| Create recipe with valid content | File written, slug returned |
| Create with invalid category | Error returned, no file |
| Create without recipes:write scope | Authorization error |

---

## Alternatives Considered

### Option A: Structured JSON input

- **Pros**: Type-safe, easier validation
- **Cons**: Loses Cooklang formatting, requires serialization
- **Why rejected**: Raw Cooklang preserves user's formatting

### Option B: Raw Cooklang input (Selected)

- **Pros**: Preserves formatting, matches API pattern, AI-friendly
- **Cons**: Requires parsing for validation
- **Why selected**: Consistency with existing API, better UX
