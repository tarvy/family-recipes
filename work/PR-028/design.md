# PR-028: Add `recipes:write` OAuth Scope - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-01-30
> **Author**: Claude Code

---

## Overview

Add a new `recipes:write` OAuth scope to the existing scope system. This is a foundational change that enables future MCP tools to require write authorization for recipe operations.

---

## Architecture

### System Context

```
OAuth Flow:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Client   │────▶│ Auth Server  │────▶│  MCP Server  │
│ (Claude Code)│     │ (OAuth 2.1)  │     │   (Tools)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ OAUTH_SCOPES │
                     │ ├─ recipes:read
                     │ ├─ recipes:write  ← NEW
                     │ ├─ shopping:read
                     │ └─ shopping:write
                     └──────────────┘
```

### Data Flow

1. Client requests authorization with `scope=recipes:read recipes:write`
2. `parseScopes()` validates both scopes
3. User consents to both scopes
4. Access token includes both scopes
5. MCP tools check `TOOL_SCOPES` for required scopes

---

## Database Changes

None. Scopes are stored as strings in existing OAuth documents.

---

## API Design

No new endpoints. Existing `/api/oauth/authorize` and `/api/oauth/token` support the new scope automatically.

---

## File Structure

```
src/
└── lib/
    └── oauth/
        └── types.ts  ← Add scope here
```

---

## Code Changes

### `src/lib/oauth/types.ts`

```typescript
export const OAUTH_SCOPES = {
  'recipes:read': 'Read recipes, search, and lookup ingredients',
  'recipes:write': 'Create and modify recipes',  // NEW
  'shopping:read': 'View shopping lists',
  'shopping:write': 'Create and modify shopping lists',
} as const;
```

### `src/mcp/server.ts`

Update MCP_INSTRUCTIONS to mention upcoming write capabilities:

```typescript
## Coming Soon

- \`recipe_create\` - Create new recipes (requires \`recipes:write\` scope)
- \`recipe_update\` - Update existing recipes (requires \`recipes:write\` scope)
```

---

## Dependencies

### New Packages

None.

### Internal Dependencies

- Used by: PR-029, PR-030 (recipe MCP tools)

---

## Security Considerations

- [x] Input validation implemented (existing `parseScopes()`)
- [x] Authentication required for endpoints (existing OAuth flow)
- [x] Authorization checks in place (existing `hasRequiredScopes()`)
- [x] No sensitive data in logs
- [x] NoSQL injection prevented (Mongoose schema validation)

---

## Observability

No new logging needed. Existing OAuth logging covers scope handling.

---

## Testing Strategy

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| `parseScopes('recipes:write')` returns `['recipes:write']` | Valid scope parsed | [ ] |
| TypeScript compiles without errors | Types updated correctly | [ ] |
| Lint passes | No style violations | [ ] |

---

## Alternatives Considered

### Option A: Separate `recipes:create` and `recipes:update` scopes

- **Pros**: Fine-grained permissions
- **Cons**: More complex consent UX, inconsistent with `shopping:write`
- **Why rejected**: Simpler is better; matches existing pattern

### Option B: Single `recipes:write` (Selected)

- **Pros**: Consistent with `shopping:write`, simpler UX
- **Cons**: Less granular
- **Why selected**: Matches established pattern, sufficient for use case

---

## Open Design Questions

None.
