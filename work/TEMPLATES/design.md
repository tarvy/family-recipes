# PR-XXX: [Feature Name] - Technical Design

> **Status**: Draft | In Review | Approved
> **Last Updated**: YYYY-MM-DD
> **Author**: [Agent/Human]

---

## Overview

[High-level summary of the technical approach. 2-3 sentences max.]

---

## Architecture

### System Context

```
[ASCII diagram or description of how this feature fits into the overall system]
```

### Component Design

```
[Component diagram showing new/modified components]
```

### Data Flow

```
[Sequence diagram or flow description]
```

---

## Database Changes

### New Tables

```sql
-- Table: table_name
-- Purpose: [why this table exists]

CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Schema Modifications

| Table | Change | Migration Required |
|-------|--------|-------------------|
| [table] | [add column X] | Yes/No |

### Indexes

```sql
CREATE INDEX idx_name ON table_name(column);
```

---

## API Design

### Endpoints

#### `POST /api/resource`

**Purpose**: [What this endpoint does]

**Request**:
```typescript
interface CreateResourceRequest {
  field: string;
}
```

**Response**:
```typescript
interface CreateResourceResponse {
  id: string;
  field: string;
  createdAt: string;
}
```

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_INPUT | [When this occurs] |
| 401 | UNAUTHORIZED | [When this occurs] |

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ComponentName` | `src/components/feature/` | [Purpose] |

### Component Hierarchy

```
PageComponent
├── LayoutComponent
│   ├── HeaderComponent
│   └── ContentComponent
│       ├── ChildA
│       └── ChildB
```

### State Management

[How state is managed - React state, URL params, server state, etc.]

---

## File Structure

```
src/
├── app/
│   └── [new routes]
├── components/
│   └── [new components]
├── lib/
│   └── [new utilities]
└── db/
    └── [schema changes]
```

---

## Dependencies

### New Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `package-name` | ^1.0.0 | [Why needed] |

### Internal Dependencies

- Depends on: `src/lib/existing-module.ts`
- Used by: [Future features that will use this]

---

## Security Considerations

- [ ] Input validation implemented
- [ ] Authentication required for endpoints
- [ ] Authorization checks in place
- [ ] No sensitive data in logs
- [ ] SQL injection prevented (Drizzle parameterized queries)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| [event] | info/warn/error | [what to log] |

### Traces

| Span | Attributes |
|------|------------|
| `operation.name` | [key attributes] |

### Metrics

| Metric | Type | Labels |
|--------|------|--------|
| [metric_name] | counter/gauge/histogram | [labels] |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `module.ts` | [What to test] |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| [User flow] | [What to verify] |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| [Scenario] | [High-level steps] |

---

## Rollout Plan

1. [ ] Implement behind feature flag (if applicable)
2. [ ] Deploy to preview
3. [ ] Manual verification
4. [ ] Merge to main
5. [ ] Monitor for errors

---

## Alternatives Considered

### Option A: [Name]
- **Pros**: [advantages]
- **Cons**: [disadvantages]
- **Why rejected**: [reason]

### Option B: [Name] (Selected)
- **Pros**: [advantages]
- **Cons**: [disadvantages]
- **Why selected**: [reason]

---

## Open Design Questions

- [ ] [Question 1]
- [ ] [Question 2]
