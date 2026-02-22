# PR-040: Audit Logging - Technical Design

## Architecture

```
Recipe CRUD (repository.ts)
    │
    ▼
audit() helper (fire-and-forget, src/lib/audit.ts)
    │
    ▼
AuditLog model → MongoDB `audit_logs` collection (TTL: 30 days)
    ▲
    │
npm run logs -- list|search|stats (scripts/logs.ts)
```

## Data Model

- Collection: `audit_logs`
- TTL: 30 days via `expireAfterSeconds: 2592000`
- Indexes: `{ operation: 1, timestamp: -1 }`, `{ 'resource.slug': 1 }`, `{ source: 1, timestamp: -1 }`

## Key Design Decisions

1. **Fire-and-forget**: `audit()` is synchronous (returns void), uses `void` operator to discard promise
2. **Silent failures**: Audit write errors are logged but never thrown
3. **Source tracking**: `updateRecipe` and `deleteRecipe` gain optional `source` parameter
4. **CLI follows allowlist.ts pattern**: shebang, nextEnv, createLogger, withTrace, disconnectDB in finally
