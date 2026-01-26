# PR-006: Database Schema - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-25
> **Author**: Codex

---

## Overview

Add Drizzle ORM configuration and define the Postgres schema for core auth, recipes, and shopping
tables. Provide a typed db client entry point to standardize future query modules.

---

## Architecture

### System Context

```
Next.js app -> src/db/index.ts (db client) -> Drizzle ORM -> Neon Postgres
```

### Component Design

```
src/db/index.ts
├── creates postgres-js client
├── configures drizzle with schema
└── exports db + schema

src/db/schema.ts
└── pg-core table definitions + enums

drizzle.config.ts
└── Drizzle Kit config for migrations
```

### Data Flow

```
Feature code -> db client -> Drizzle query builder -> Postgres
```

---

## Database Changes

### New Tables

```sql
-- Table: users
-- Purpose: Application users and roles

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Additional tables in this PR:
- `sessions`, `magic_links`, `passkeys`
- `recipes`
- `shopping_lists`, `shopping_list_items`, `shopping_list_recipes`
- `recipe_favorites`, `recipe_history`, `recipe_notes`

### Schema Modifications

| Table | Change | Migration Required |
|-------|--------|-------------------|
| n/a | New schema | Yes |

### Indexes

```sql
CREATE UNIQUE INDEX recipes_slug_unique ON recipes(slug);
CREATE UNIQUE INDEX recipes_file_path_unique ON recipes(file_path);
```

---

## API Design

No API changes in this PR. Query modules will be added in later PRs.

---

## UI Components

No UI changes in this PR.

---

## File Structure

```
drizzle.config.ts
drizzle/
src/
└── db/
    ├── index.ts
    └── schema.ts
```

---

## Dependencies

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | latest | Schema + query builder |
| `drizzle-kit` | latest | Migrations + Drizzle Studio |
| `postgres` | latest | Postgres client for Drizzle |

### Internal Dependencies

- Depends on: `src/lib/logger.ts`
- Used by: future query modules and API routes

---

## Security Considerations

- [x] Input validation implemented (future query layer)
- [x] Authentication required for endpoints (future PRs)
- [x] Authorization checks in place (future PRs)
- [x] No sensitive data in logs
- [x] SQL injection prevented (Drizzle parameterized queries)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| db client init | info | environment present |
| db config missing | error | missing `DATABASE_URL` |

### Traces

| Span | Attributes |
|------|------------|
| `db.*` | `db.system`, `db.operation`, `db.sql.table` |

### Metrics

No metrics added in this PR.

---

## Testing Strategy

### Unit Tests

None in this PR.

### Integration Tests

None in this PR.

### E2E Tests

None in this PR.

---

## Rollout Plan

1. [ ] Implement schema + db client
2. [ ] Validate config loads with `DATABASE_URL`
3. [ ] Merge to main

---

## Alternatives Considered

### Option A: `pg` driver
- **Pros**: widely used, pool control
- **Cons**: heavier configuration in serverless
- **Why rejected**: `postgres` keeps setup minimal

### Option B: `postgres` driver (Selected)
- **Pros**: simple connection string usage, Drizzle examples align
- **Cons**: fewer pool tuning options
- **Why selected**: simplest baseline for PR-006

---

## Open Design Questions

- [ ] Should we add tsvector GIN indexes in migrations or wait for sync work?
- [ ] Do we want defaults for user roles and shopping list status?
