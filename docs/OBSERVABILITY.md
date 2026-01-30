# Observability

This document covers logging and telemetry for the Family Recipes application.

---

## Overview

The application uses:
- **Pino** for structured logging
- **Vercel Logs** as the primary debugging surface

Distributed tracing is **disabled**. Telemetry helpers remain as safe no-ops so
APIs stay stable while we keep the door open for future reintroduction.

---

## Architecture

```
Client -> Vercel (Next.js API Routes) -> Pino (stdout) -> Vercel Logs
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
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
logger.api.info('Request received');
logger.api.error('Request failed', error);

// Database operations
logger.db.debug('Query executed', { table: 'recipes', count: 10 });

// Authentication
logger.auth.warn('Invalid token', { userId: 'abc123' });

// Recipe operations
logger.recipes.info('Recipe created', { recipeId: 'xyz', title: 'Pasta' });
```

### Request Context (API Routes)

Wrap handlers with `withRequestContext` to include `requestId`, `path`, and
`method` on every log within the request lifecycle.

```typescript
import { logger, withRequestContext } from '@/lib/logger';
import { withTrace } from '@/lib/telemetry';

export async function POST(request: Request) {
  return withRequestContext(request, () =>
    withTrace('api.example', async () => {
      logger.api.info('Request received');
      return Response.json({ ok: true });
    }),
  );
}
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
    method: "POST"
    requestId: "abc123..."
```

**Production** (JSON):
```json
{
  "level": 30,
  "time": 1706198096000,
  "context": "api",
  "requestId": "abc123...",
  "path": "/api/recipes",
  "method": "POST",
  "msg": "Request received"
}
```

---

## Telemetry (Disabled)

`withTrace` and `traceDbQuery` are intentionally implemented as no-ops. They
preserve a stable API surface for future observability work without introducing
runtime dependencies that cause issues on Vercel.

```typescript
import { withTrace, traceDbQuery } from '@/lib/telemetry';

await withTrace('api.recipes.list', async () => {
  const recipes = await traceDbQuery('find', 'recipes', () => fetchRecipes());
  return recipes;
});
```

---

## Viewing Logs (Vercel)

1. Open the Vercel project dashboard
2. Go to **Logs**
3. Filter by function name or search for `requestId`

---

## Future Observability (Optional)

If this application ever needs end-to-end observability, tracing can be
reintroduced in a separate PR. For now, the added complexity is not justified
for the current scale and deployment model.
