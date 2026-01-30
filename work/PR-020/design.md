# PR-020: Observability - Vercel Logs First (No OTEL) - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-28
> **Author**: Codex

---

## Overview

Adopt a Vercel-first logging strategy using existing Pino loggers and keep telemetry helpers as safe no-ops. Align documentation with runtime reality (no active OTEL), while preserving stable APIs (`withTrace`, `traceDbQuery`) for future reintroduction of tracing. Remove Grafana-related infrastructure and CI wiring to avoid unused observability dependencies.

---

## Architecture

### System Context

```
Client -> Vercel (Next.js API Routes) -> Pino (stdout) -> Vercel Logs UI/CLI
```

### Component Design

```
API Route
  -> withTrace() (no-op)
  -> logger.* (adds request context)
  -> stdout JSON
```

### Data Flow

```
Request -> extract request metadata -> log events -> Vercel logs
```

---

## Database Changes

None.

---

## API Design

No new endpoints. Existing API routes continue to log via `logger.*`.

---

## UI Components

No UI changes.

---

## File Structure

```
src/
├── lib/
│   ├── logger.ts          # optional request context helper
│   └── telemetry.ts       # keep no-op API
├── instrumentation.ts     # minimal no-op (no OTEL imports)
└── app/
    └── api/*/route.ts      # no changes unless adding context fields

docs/
├── OBSERVABILITY.md        # update to Vercel-first logging
└── ENVIRONMENT.md          # adjust runtime env vars if needed

.github/
└── workflows/terraform.yml  # remove Grafana TF_VAR wiring

infra/terraform/
└── (remove Grafana provider/module/outputs)
```

---

## Dependencies

### New Packages

None planned.

### Internal Dependencies

- `src/lib/telemetry.ts` used by `src/lib/logger.ts`
- `src/lib/logger.ts` used across API routes and services

---

## Security Considerations

- [ ] Continue to avoid logging secrets/PII
- [ ] Sanitize error objects before logging (already handled by logger)
- [ ] Keep request metadata minimal (id, path, method, user agent if needed)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| API request received | info | request id, path, method |
| API request failed | error | request id, error name/message, status |
| Auth magic link issued | info | redacted indicator (no PII) |

### Traces

No distributed tracing in this PR. `withTrace` remains a no-op to preserve API stability.

### Metrics

None.

---

## Testing Strategy

### Unit Tests

Optional: cover request context helper if added.

### Integration Tests

- Manual verification in Vercel logs for auth flow request/response logging.

---

## Rollout Plan

1. Update documentation to reflect Vercel-first logging.
2. Add/confirm minimal `src/instrumentation.ts` no-op with no OTEL imports.
3. Add optional request context enrichment in `logger.ts` or API middleware.
4. Verify logs appear in Vercel for auth API routes.

---

## Risks and Mitigations

- **Risk**: Loss of tracing visibility.
  - **Mitigation**: Keep telemetry APIs stable for future reintroduction.
- **Risk**: Docs drift persists.
  - **Mitigation**: Update `docs/OBSERVABILITY.md` (and `docs/ENVIRONMENT.md` if runtime env vars change) in this PR.
