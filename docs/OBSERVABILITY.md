# Observability

This document covers logging, tracing, and monitoring for the Family Recipes application.

---

## Overview

The application uses:
- **OpenTelemetry** for distributed tracing
- **Pino** for structured logging
- **Grafana Cloud** for trace visualization (Tempo)

All traces and logs are correlated via trace IDs for easy debugging.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Application                                  │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  API Route   │    │  Database    │    │   Service    │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┴───────────────────┘                   │
│                             │                                       │
│                    ┌────────┴────────┐                              │
│                    │ Telemetry Layer │                              │
│                    │  - withTrace()  │                              │
│                    │  - logger.*     │                              │
│                    └────────┬────────┘                              │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Grafana Cloud  │
                    │  - Tempo        │
                    └─────────────────┘
```

---

## Grafana Cloud Setup

### 1. Create Account

Sign up at [grafana.com](https://grafana.com/products/cloud/) (free tier available).

### 2. Get Credentials

1. Go to your Grafana Cloud portal
2. Click on your stack
3. Go to **Connections** → **Add new connection**
4. Search for **OpenTelemetry**
5. Follow the setup wizard to get:
   - OTLP Endpoint URL
   - Instance ID
   - API Key (with write permissions)

### 3. Configure Environment

Add to `.env.local`:

```bash
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
GRAFANA_INSTANCE_ID=123456
GRAFANA_API_KEY=your-api-key-here
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GRAFANA_OTLP_ENDPOINT` | For tracing | - | Grafana Cloud OTLP endpoint |
| `GRAFANA_INSTANCE_ID` | For tracing | - | Grafana Cloud instance ID |
| `GRAFANA_API_KEY` | For tracing | - | Grafana Cloud API key |
| `LOG_LEVEL` | No | `debug` (dev) / `info` (prod) | Minimum log level |

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Detailed diagnostic information |
| `info` | General operational events |
| `warn` | Potential issues, recoverable errors |
| `error` | Errors that affect functionality |

---

## Logging

### Using Pre-configured Loggers

```typescript
import { logger } from '@/lib/logger';

// API routes
logger.api.info('Request received', { path: '/api/recipes', method: 'GET' });
logger.api.error('Request failed', error, { path: '/api/recipes' });

// Database operations
logger.db.debug('Query executed', { table: 'recipes', count: 10 });

// Authentication
logger.auth.warn('Invalid token', { userId: 'abc123' });

// Recipe operations
logger.recipes.info('Recipe created', { recipeId: 'xyz', title: 'Pasta' });
```

### Creating Custom Loggers

```typescript
import { createLogger } from '@/lib/logger';

const log = createLogger('my-module');

log.info('Operation started', { itemId: 123 });
log.error('Operation failed', error, { itemId: 123 });
```

### Log Output

**Development** (pretty printed):
```
12:34:56 INFO (api): Request received
    path: "/api/recipes"
    method: "GET"
    traceId: "abc123..."
```

**Production** (JSON):
```json
{
  "level": 30,
  "time": 1706198096000,
  "context": "api",
  "traceId": "abc123...",
  "spanId": "def456...",
  "path": "/api/recipes",
  "method": "GET",
  "msg": "Request received"
}
```

---

## Tracing

### Wrapping Operations

Use `withTrace` to create spans for any async operation:

```typescript
import { withTrace } from '@/lib/telemetry';

export async function GET(request: Request) {
  return withTrace('api.recipes.list', async (span) => {
    // Add custom attributes
    span.setAttribute('recipes.filter', 'all');

    const recipes = await fetchRecipes();

    span.setAttribute('recipes.count', recipes.length);

    return Response.json(recipes);
  });
}
```

### Tracing Database Queries

Use `traceDbQuery` for database operations:

```typescript
import { traceDbQuery } from '@/lib/telemetry';
import { db } from '@/db';
import { recipes } from '@/db/schema';

const allRecipes = await traceDbQuery('select', 'recipes', async () => {
  return db.select().from(recipes);
});

const newRecipe = await traceDbQuery('insert', 'recipes', async () => {
  return db.insert(recipes).values({ title: 'Pasta' }).returning();
});
```

### Nested Traces

Traces automatically nest when you call `withTrace` inside another traced function:

```typescript
async function handleRequest() {
  return withTrace('api.request', async () => {
    // This creates a child span
    const user = await withTrace('auth.validate', async () => {
      return validateSession();
    });

    // Another child span
    const data = await traceDbQuery('select', 'recipes', async () => {
      return db.select().from(recipes).where(eq(recipes.userId, user.id));
    });

    return data;
  });
}
```

---

## Viewing Traces

### In Grafana Cloud

1. Go to your Grafana Cloud instance
2. Navigate to **Explore**
3. Select **Tempo** as the data source
4. Search by:
   - Service name: `family-recipes`
   - Trace ID (from logs)
   - Span name

### Filtering Traces

Common queries:
- `{service.name="family-recipes"}` - All traces
- `{service.name="family-recipes" && name=~"db.*"}` - Database operations
- `{service.name="family-recipes" && status=error}` - Failed operations

---

## Best Practices

### What to Log

- Request start/end with timing
- Database operations
- External API calls
- Authentication events
- Business logic decisions
- Errors with context

### What NOT to Log

- Passwords or secrets
- Full request/response bodies (unless debugging)
- Personal identifiable information (PII)
- Credit card numbers
- API keys or tokens

### Trace Naming

Use hierarchical names:
- `api.recipes.list`
- `api.recipes.create`
- `db.select`
- `auth.validate`
- `email.send`

### Error Handling

Always include error context:

```typescript
try {
  await doSomething();
} catch (error) {
  logger.api.error('Operation failed', error instanceof Error ? error : undefined, {
    operation: 'doSomething',
    input: sanitizedInput,
  });
  throw error;
}
```

---

## Troubleshooting

### Traces Not Appearing

1. Check credentials in `.env.local`
2. Verify `GRAFANA_OTLP_ENDPOINT` format (should include `/otlp`)
3. Check Grafana Cloud API key has write permissions
4. Look for warning in console: `Grafana credentials not configured`

### Logs Not Pretty Printing

Ensure `NODE_ENV=development` is set.

### Missing Trace Correlation

Trace context only works within the same request. Background jobs start new traces.

---

## Files

| File | Purpose |
|------|---------|
| `src/instrumentation.ts` | OpenTelemetry SDK initialization |
| `src/lib/telemetry.ts` | Tracing helper functions |
| `src/lib/logger.ts` | Structured logger |
| `src/env.d.ts` | Environment variable types |
