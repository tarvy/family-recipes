# PR-031: Add `recipe_categories` MCP Tool - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-01-30
> **Author**: Claude Code

---

## Overview

Add a `recipe_categories` MCP tool that returns the list of valid recipe categories. This is a simple read-only tool that helps AI clients validate category input before creating/updating recipes.

---

## Architecture

### Data Flow

```
┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
│  AI Client   │────▶│ recipe_categories  │────▶│ getCategories│
│              │     │     MCP Tool       │     │   Loader     │
└──────────────┘     └────────────────────┘     └──────────────┘
                                │
                                ▼
                         { categories: [...] }
```

---

## API Design

### Tool: `recipe_categories`

**Input Schema**:
```typescript
{
  // No input parameters
}
```

**Output Schema**:
```typescript
{
  categories: z.array(z.string()),
}
```

**Required Scope**: `recipes:read`

---

## Code Changes

### `src/lib/oauth/types.ts`

Add to TOOL_SCOPES:
```typescript
recipe_categories: ['recipes:read'],
```

### `src/mcp/tools/recipes.ts`

```typescript
server.registerTool(
  'recipe_categories',
  {
    title: 'List recipe categories',
    description: 'Get the list of valid recipe categories.',
    inputSchema: {},
    outputSchema: {
      categories: z.array(z.string()),
    },
  },
  async () => {
    return withTrace('mcp.tool.recipe_categories', async (span) => {
      const categories = getCategories();
      span.setAttribute('category_count', categories.length);

      logger.mcp.info('MCP recipe_categories executed', {
        count: categories.length,
      });

      return buildToolResult({ categories });
    });
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
        └── recipes.ts  ← Add recipe_categories tool
```

---

## Security Considerations

- [x] Read-only operation
- [x] No user input to validate
- [x] Requires `recipes:read` scope for consistency

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Categories listed | info | count |

---

## Future Considerations

The current `getCategories()` returns a hardcoded list. A future enhancement could:
- Scan filesystem for actual directories
- Return category metadata (recipe counts, descriptions)

This is intentionally deferred to keep the initial implementation simple.
