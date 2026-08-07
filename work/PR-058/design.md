# PR-058: Owner-Distributed Magic Links - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-08-07
> **Author**: Cursor

---

## Overview

Replace Resend-backed magic-link delivery with an owner-only admin action that
creates a short-lived, single-use token and returns a copyable verification URL.
The existing MongoDB token model and verification flow remain the source of truth,
so passkey registration can follow a successful manually distributed login.

---

## Architecture

### System Context

```
Owner browser
    │ authenticated owner session
    ▼
Settings → Admin Magic Link form
    │ POST /api/admin/magic-link
    ▼
Owner authorization → allowlist check → MongoDB MagicLink
    │ generated URL returned once
    ▼
Owner distributes link manually → recipient opens /api/auth/verify
    ▼
Session cookie → Settings → register passkey
```

### Component Design

```
Settings page
├── existing PasskeyManager
│   └── revoke action per credential
└── ManualMagicLinkForm (owner only)
    ├── allowlisted email input
    ├── generate action
    └── one-time copyable URL output
```

### Data Flow

1. The owner submits a normalized email.
2. The API authenticates the session and requires the `owner` role.
3. The API verifies the email is allowlisted.
4. The service deletes prior unused links for that email, creates a 32-character
   token with a 15-minute expiry, and returns a URL built from
   `NEXT_PUBLIC_APP_URL`.
5. The token is never included in logs or persisted outside MongoDB.
6. Existing verification atomically marks the token used and creates the session.

---

## Database Changes

### Schema Modifications

| Collection | Change | Migration Required |
|------------|--------|-------------------|
| `magic_links` | No schema change; reuse existing token, expiry, and used fields | No |

### Indexes

Existing TTL and token indexes remain unchanged.

---

## API Design

### `POST /api/admin/magic-link`

**Purpose**: Generate a manually distributable login URL.

**Auth**: Authenticated owner only.

**Request**:

```typescript
interface CreateManualMagicLinkRequest {
  email: string;
}
```

**Response**:

```typescript
interface CreateManualMagicLinkResponse {
  url: string;
  expiresAt: string;
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_EMAIL | Email is missing or malformed |
| 403 | FORBIDDEN | Caller is not the owner or email is not allowlisted |
| 500 | SERVER_ERROR | Token could not be created |

### `DELETE /api/auth/passkey/[id]`

**Purpose**: Revoke one passkey owned by the current session user.

**Auth**: Any authenticated user; deletion query is scoped by `userId`.

**Response**:

```typescript
interface DeletePasskeyResponse {
  success: true;
}
```

**Errors**:

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | No valid session |
| 400 | INVALID_ID | Credential ID is not a valid MongoDB ID |
| 404 | NOT_FOUND | Credential does not belong to the current user |

### Existing `GET /api/auth/verify`

No contract change. It continues to atomically consume valid tokens, reject
expired/reused tokens, create a user when appropriate, and create a session.

### Existing `POST /api/auth/send`

Remove the Resend-backed delivery route after the manual route is available.
The login UI will direct users to the owner-distribution workflow rather than
attempting email delivery.

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ManualMagicLinkForm` | `src/components/auth/manual-magic-link-form.tsx` | Owner-only form to generate and copy a link |

### State Management

The form uses local React state for input, loading, error, and generated-link
display. The generated URL is cleared when a new request starts and is never
re-fetched from the server.

---

## File Structure

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (main)/settings/page.tsx
│   ├── api/admin/magic-link/route.ts
│   └── api/auth/passkey/[id]/route.ts
├── components/auth/manual-magic-link-form.tsx
├── components/auth/passkey-manager.tsx
├── lib/auth/magic-link.ts
├── db/models/passkey.model.ts
└── lib/email/send.ts                         # removed
docs/
├── AUTH.md
└── ENVIRONMENT.md
```

---

## Dependencies

### New Packages

None.

### Removed Packages

`resend` is removed because authentication no longer performs email delivery.

### Internal Dependencies

- `src/lib/auth/authorization.ts`
- `src/lib/auth/allowlist.ts`
- `src/lib/auth/magic-link.ts`
- `src/lib/auth/session.ts`
- `src/lib/audit.ts`
- `src/lib/logger.ts`
- `src/lib/telemetry.ts`

---

## Security Considerations

- [x] Input validation implemented with normalized email and format validation.
- [x] Authentication and owner authorization required.
- [x] Allowlist membership required before token creation.
- [x] Token omitted from logs and audit records.
- [x] Existing atomic consumption and expiry checks preserved.
- [x] Response contains the bearer URL only to the authenticated owner.
- [x] No database query bypasses Mongoose models.

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Manual link generated | info | target email, owner user ID, expiry timestamp |
| Unauthorized generation attempt | warn | caller user ID, reason |
| Token creation failure | error | target email, normalized error |

The URL and raw token are never logged.

### Traces

| Span | Attributes |
|------|------------|
| `api.admin.magic-link.create` | requester user ID, target email, outcome |
| `auth.magic-link.create-manual` | target email, expiry timestamp |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `magic-link.ts` | Token creation, normalization, expiry, URL generation |
| Admin route | Validation and owner/allowlist authorization |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Manual link lifecycle | Generate → verify → second verification rejected |
| Expiry | Expired generated token rejected |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| Owner recovery | Owner generates link, opens it, registers passkey |

---

## Rollout Plan

1. [ ] Implement manual generation and UI.
2. [ ] Remove Resend runtime dependency and configuration documentation.
3. [ ] Run lint, typecheck, build, and focused tests.
4. [ ] Deploy to preview and manually verify the full owner flow.
5. [ ] Deploy production and remove obsolete Resend variables.

---

## Alternatives Considered

### Option A: Keep Resend and add a fallback

- **Pros**: Preserves familiar email flow.
- **Cons**: Retains the current provider failure mode and configuration burden.
- **Why rejected**: The owner explicitly wants provider-independent manual distribution.

### Option B: Owner-generated link (Selected)

- **Pros**: No provider dependency, easy recovery, reuses existing secure token flow.
- **Cons**: The owner must manually distribute the bearer URL.
- **Why selected**: Matches the personal-app operating model and requested workflow.

---

## Open Design Questions

- [ ] Should the owner-only form be visible on Settings or a dedicated admin page?
- [ ] Should the generated link include a copy button only, or also a native share action?
