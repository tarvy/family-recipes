# PR-061: Fix PWA Client-Side Exception - Technical Design

> **Status**: Approved (production incident)
> **Last Updated**: 2026-08-29
> **Author**: Cursor Cloud Agent

---

## Overview

Stop serving stale HTML from the service worker after deploys, invalidate
existing `v1` caches, and add a one-shot client recovery path when Next.js
chunk loads fail. Keep hashed `/_next/static` assets cache-first.

---

## Architecture

### System Context

```
iPhone PWA / Safari
    │
    ▼
public/sw.js  ──► navigations: network-first
                  static /_next/static: cache-first (hashed)
                  API/recipes: network-first (unchanged)
    │
    ▼
PWAProvider / register-sw.ts
    └── on ChunkLoadError → clear caches → reload once
```

### Root Cause

Current `staleWhileRevalidate` for navigations returns cached HTML immediately.
After a Vercel deploy, that HTML references old chunk hashes that 404 or
mismatch the new runtime → React client exception. Precaching `/`, `/recipes`,
and `/shopping-list` pins those shells in `family-recipes-static-v1`.

### Component Design

| File | Change |
|------|--------|
| `public/sw.js` | Bump `CACHE_VERSION` to `v2`; network-first navigations; remove HTML from precache; safe message handler |
| `src/lib/pwa/register-sw.ts` | Detect chunk/load failures; clear caches; single reload |
| `src/lib/pwa/recover-stale-cache.ts` | Shared recovery helper (testable) |
| `src/app/global-error.tsx` | Branded fallback with Reload button |
| `docs/DEVELOPMENT.md` or short PWA note | Document SW caching rules |

### Data Flow

```
Online navigate
  → SW networkFirst(document)
  → on success: update dynamic cache
  → on failure: fall back to cache / offline response

ChunkLoadError in window
  → session flag not set?
  → caches.delete(*) + optional SW unregister message CLEAR_CACHE
  → location.reload()
```

---

## Database Changes

None.

---

## API Changes

None.

---

## Security Considerations

- Recovery only clears same-origin Cache Storage; no auth cookies cleared
- Reload-once guard via `sessionStorage` prevents infinite loops

---

## Testing Strategy

- Unit: `isStaleChunkError()` / recovery guard helpers
- Manual / Playwright: login loads with SW registered; poisoned HTML cache no longer wins while online
- Lint + typecheck

---

## Implementation Notes

1. Prefer network for `request.mode === 'navigate'` and `Accept: text/html`
2. Precache only `/manifest.json` (and optional tiny offline body via `Response`, not a routed page)
3. Guard `event.data?.type` before property access in SW message handler
