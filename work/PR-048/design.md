# PR-048: Passkey Localhost Origin Compatibility - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-03-02
> **Author**: Codex

---

## Overview

Allow WebAuthn verification to accept a request-origin fallback only for localhost development when the configured app origin is also localhost. This resolves failures when Next.js moves from port 3000 to another local port while preserving strict origin checks for non-local environments.

---

## Architecture

### System Context

```
Browser (localhost:3001)
  -> /api/auth/passkey/* route
    -> passkey verify helper (origin policy)
      -> @simplewebauthn/server verification
```

### Component Design

```
route.ts (register/authenticate)
  └── verifyPasskey*(
        response,
        credential/challenge,
        request.headers.get('origin')
      )
        └── getWebAuthnConfig(requestOrigin?)
              ├── configured origin (NEXT_PUBLIC_APP_URL)
              └── localhost-only fallback origin list
```

### Data Flow

```
1) Client posts passkey response with Origin header (e.g., http://localhost:3001)
2) API route forwards request origin to passkey verifier
3) Helper computes expectedOrigin:
   - non-localhost config: configured origin only
   - localhost config + localhost request origin: [configured, requestOrigin]
4) WebAuthn verification succeeds for matching origin
```

---

## Database Changes

No database changes.

---

## API Design

No endpoint contract changes; internal verification behavior only.

---

## File Structure

```
src/lib/auth/passkey.ts                              (updated)
src/app/api/auth/passkey/authenticate/route.ts      (updated)
src/app/api/auth/passkey/register/route.ts          (updated)
docs/AUTH.md                                        (updated)
```

---

## Dependencies

No new packages.

---

## Security Considerations

- [x] Authentication required for register endpoint unchanged
- [x] Authorization checks unchanged
- [x] Origin fallback limited to loopback/localhost only
- [x] Non-localhost origins remain strict

---

## Observability

Current route-level request logging remains unchanged.

---

## Testing Strategy

### Manual Verification

1. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. Start app with port fallback to `http://localhost:3001`
3. Verify passkey authenticate and passkey register complete successfully

### Automated Validation

- `npm run lint`
- `npm run typecheck`

---

## Alternatives Considered

### Option A: Change `.env.local` to active port each run
- **Pros**: No code changes
- **Cons**: Fragile and manual; breaks whenever port changes again
- **Why rejected**: Poor developer experience and recurrent breakage

### Option B: Localhost-only dynamic origin fallback (Selected)
- **Pros**: Robust in dev, minimal code changes, preserves production strictness
- **Cons**: Slightly more helper logic
- **Why selected**: Solves reported issue without reducing security for real deployments

---

## Open Design Questions

- [ ] None
