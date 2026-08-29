# PR-061: Fix PWA Client-Side Exception - Progress & Agent Handoff

> **Status**: Testing
> **Started**: 2026-08-29
> **Branch**: `cursor/fix-pwa-client-exception-95c2`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [x] Review [x] Approved | Production incident |
| Design | [x] Draft [x] Review [x] Approved | SW network-first + recovery |
| Implementation | [ ] Not Started [ ] In Progress [x] Complete | |
| Testing | [x] Unit [ ] Integration [x] E2E | Playwright poison-cache online |
| Documentation | [x] Updated [ ] Reviewed | docs/DEVELOPMENT.md |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | |

---

## Deliverables Checklist

- [x] `public/sw.js` - Cache v2, network-first navigations, no HTML precache
- [x] `src/lib/pwa/recover-stale-cache.ts` - Chunk error detection + one-shot recovery
- [x] `src/lib/pwa/register-sw.ts` - Wire recovery listeners
- [x] `src/app/global-error.tsx` - Reload UI for uncaught client errors
- [x] `src/lib/pwa/__tests__/recover-stale-cache.test.ts` - Unit coverage
- [x] Docs note on SW caching behavior

---

## Implementation Phases

### Phase 1: Service worker caching fix

**Status**: Complete

### Phase 2: Client recovery + global error UI

**Status**: Complete

---

## Session Log

### 2026-08-29 — Incident triage + fix

- Reproduced: login works on fresh desktop/mobile Chromium; no console errors
- User screenshot: Next.js Application error on gingham background (iPhone)
- Confirmed SW `staleWhileRevalidate` + HTML precache can serve poisoned docs
- Playwright: injecting stale HTML into dynamic cache caused page errors on old SW
- Implemented v2 SW (network-first navigations), recovery helper, global-error UI
- Unit tests pass; lint + typecheck pass
- Playwright with v2 SW: online load prefers network over poisoned cache

---

## Blockers & Decisions

- Decision: treat as PWA stale-cache incident (cannot get iPhone console from user)
- Decision: network-first navigations over removing SW entirely
