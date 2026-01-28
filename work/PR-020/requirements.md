# PR-020: Observability - Vercel Logs First (No Grafana OTEL) - Requirements

> **Status**: Draft
> **PR Branch**: `feat/pr-020-observability-logs`
> **Dependencies**: None

---

## Problem Statement

Observability is inconsistent with the current runtime: OpenTelemetry/Grafana was attempted, then disabled due to ESM/CJS issues on Vercel. `src/lib/telemetry.ts` is a no-op, `src/instrumentation.ts` is missing, and docs still claim Grafana/OTLP is active. We need a Vercel-first logging strategy that works with the existing Pino logger and keeps telemetry helpers as safe no-ops so that API routes remain stable while we debug issues (e.g., magic link auth).

---

## User Stories

### Story 1: Developer debugs auth issues using Vercel logs

**As a** developer
**I want** consistent structured logs in Vercel
**So that** I can debug auth and API issues without OTEL/Grafana

#### Acceptance Criteria

```gherkin
Feature: Vercel-first logging

  Scenario: Logs are available for API requests
    Given a user hits an API route
    When the request is processed
    Then logs include consistent context fields (request id, path, method)
    And logs are visible in Vercel logs

  Scenario: Telemetry helpers do not crash runtime
    Given tracing is disabled
    When code calls withTrace() or traceDbQuery()
    Then the request completes without errors
```

### Story 2: Maintainer can re-enable tracing later without refactors

**As a** maintainer
**I want** stable telemetry APIs that are safe no-ops today
**So that** tracing can be reintroduced in a future PR without sweeping code changes

#### Acceptance Criteria

```gherkin
Feature: Telemetry API stability

  Scenario: Telemetry APIs remain callable
    Given existing code imports telemetry helpers
    When tracing is disabled
    Then the helpers return results normally
    And no additional instrumentation code is required in callers
```

---

## Out of Scope

- Reintroducing Grafana OTLP exporters or OpenTelemetry SDK wiring
- Configuring log drains to Grafana/Loki or other vendors
- Adding distributed tracing or metrics
- Fixing unrelated build/ESM issues outside observability scope

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Vercel logs show structured entries for API routes | 100% of key endpoints | Manual verification in Vercel logs |
| Docs match runtime behavior | No claims of active Grafana/OTEL runtime tracing | Review `docs/OBSERVABILITY.md` |
| Telemetry helpers are safe no-ops | 0 runtime errors from tracing calls | Manual test on auth route |

---

## Open Questions

- Should we remove Grafana runtime env vars from `.env.example` and `docs/ENVIRONMENT.md`, or mark them as deprecated-but-optional for future tracing?
- Do we want a simple request-id correlation (e.g., `x-request-id`/`x-vercel-id`) added to logs in API routes?
- Should `src/instrumentation.ts` be a minimal no-op to satisfy Next.js expectations?
- If Vercel logs are sufficient, do we deprecate Grafana references in infra docs or keep them for future use?

---

## References

- `docs/OBSERVABILITY.md`
- `docs/ENVIRONMENT.md`
- `src/lib/logger.ts`
- `src/lib/telemetry.ts`
