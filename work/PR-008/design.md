# PR-008: Auth - Passkeys - Design

> **Status**: Draft
> **Last Updated**: 2026-01-27
> **Owners**: AI Agent + Maintainer

---

## Summary

Add WebAuthn passkey registration and authentication. Signed-in users can register passkeys on the
settings page, and returning users can sign in with a passkey from the login page. Magic links
remain the fallback authentication method.

---

## Goals

- Enable passkey registration for signed-in users
- Enable passkey authentication and session creation
- Store passkey credentials in MongoDB using existing `passkeys` collection
- Maintain observability (logging + tracing) for auth and DB operations

## Non-Goals

- Passkey deletion or renaming
- Multifactor authentication
- Device management UI beyond listing passkeys

---

## Dependencies

- `@simplewebauthn/server` and `@simplewebauthn/browser`
- Existing sessions and user models
- Environment variables:
  - `NEXT_PUBLIC_APP_URL` (origin)
  - `WEBAUTHN_RP_ID` (relying party ID)
  - `JWT_SECRET` (signing challenge cookie)

---

## Architecture

### Challenge Storage

Challenges are stored in a short-lived, signed, HTTP-only cookie to avoid new database tables. The
cookie payload includes:

- `challenge` (base64url)
- `type` (`registration` or `authentication`)
- `userId` (registration only)
- `createdAt` (ms epoch)

The cookie is signed using `JWT_SECRET` to prevent tampering and expires after 5 minutes.

### Data Model

Uses existing `passkeys` collection:

- `userId`
- `credentialId`
- `publicKey`
- `counter`
- `deviceType`
- `backedUp`
- `transports[]`
- `lastUsedAt`

---

## API Design

### POST /api/auth/passkey/register

**Purpose:** Generate registration options or verify attestation.

**Request (options):**
```json
{}
```

**Response (options):**
```json
{ "options": { ...PublicKeyCredentialCreationOptionsJSON } }
```

**Request (verification):**
```json
{ "response": { ...RegistrationResponseJSON } }
```

**Response (verification):**
```json
{ "success": true }
```

**Errors:**
- `401` if not authenticated
- `400` invalid payload
- `409` credential already exists
- `500` verification failure

### POST /api/auth/passkey/authenticate

**Purpose:** Generate authentication options or verify assertion.

**Request (options):**
```json
{}
```

**Response (options):**
```json
{ "options": { ...PublicKeyCredentialRequestOptionsJSON } }
```

**Request (verification):**
```json
{ "response": { ...AuthenticationResponseJSON } }
```

**Response (verification):**
```json
{ "success": true }
```

**Errors:**
- `400` invalid payload
- `404` credential not found
- `500` verification failure

---

## UI/UX

### Settings Page (`/settings`)

- Server component validates session and loads passkeys
- Client component triggers registration:
  1. Fetch registration options
  2. Call `startRegistration`
  3. Submit attestation to `/api/auth/passkey/register`
  4. Refresh list on success

### Login Page (`/login`)

- Add passkey sign-in button:
  1. Fetch authentication options
  2. Call `startAuthentication`
  3. Submit assertion to `/api/auth/passkey/authenticate`
  4. Redirect to `/` on success

---

## Observability

- Wrap API routes with `withTrace()`
- Trace all DB reads/writes with `traceDbQuery()`
- Log auth events using `logger.auth` and `logger.api`

---

## Security Considerations

- Validate request payloads
- Enforce session for registration
- Verify `expectedOrigin` and `expectedRPID` on responses
- Require user verification when validating passkeys
- Signed, short-lived challenge cookies

---

## Testing Plan

Manual verification (until PR-017 adds test harness):

1. Sign in via magic link
2. Register a passkey in settings
3. Sign out and sign back in using passkey
4. Attempt authentication with unknown credential (expect failure)

---

## Rollout Plan

- Merge behind feature UI on login page
- Monitor auth logs for passkey failures
- Keep magic links as fallback
