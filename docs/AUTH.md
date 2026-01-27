# Authentication

Family Recipes uses passwordless authentication via email magic links and passkeys. This provides a secure, user-friendly authentication experience without the need to remember passwords.

## Overview

The authentication system consists of:

1. **Magic Links** - One-time use tokens sent via email
2. **Passkeys** - WebAuthn credentials for fast sign-in
3. **Sessions** - Server-side session management with secure cookies
4. **User Management** - Automatic user creation on first sign-in

## Authentication Flow

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  User       │     │  POST /api/auth/send│     │  Email Service  │
│  enters     │────>│  - Validate email   │────>│  (Resend)       │
│  email      │     │  - Create token     │     │                 │
└─────────────┘     │  - Send email       │     └────────┬────────┘
                    └─────────────────────┘              │
                                                         │ Magic link email
                                                         ▼
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  Redirect   │<────│  GET /api/auth/     │<────│  User clicks    │
│  to home    │     │  verify?token=xxx   │     │  link           │
│  with       │     │  - Verify token     │     └─────────────────┘
│  session    │     │  - Find/create user │
│  cookie     │     │  - Create session   │
└─────────────┘     └─────────────────────┘
```

### Passkey Flow

```
┌─────────────┐     ┌────────────────────────────────┐     ┌────────────────┐
│  User       │     │ POST /api/auth/passkey/         │     │  Browser       │
│  chooses    │────>│ authenticate (options)          │────>│  WebAuthn UI   │
│  passkey    │     │ - Generate challenge            │     │  (passkey)     │
└─────────────┘     └────────────────────────────────┘     └────────┬───────┘
                                                                    │ Assertion
                                                                    ▼
┌─────────────┐     ┌────────────────────────────────┐
│  Session    │<────│ POST /api/auth/passkey/         │
│  cookie set │     │ authenticate (verify)           │
└─────────────┘     │ - Verify response               │
                    │ - Create session                │
                    └────────────────────────────────┘
```

## API Endpoints

### POST /api/auth/send

Send a magic link to the provided email address.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

> **Note:** This endpoint always returns `{ "success": true }` to prevent email enumeration attacks. Check the email inbox for the magic link.

### GET /api/auth/verify

Verify a magic link token and create a session. This is the callback URL from magic link emails.

**Query Parameters:**
- `token` - The magic link token from the email

**Behavior:**
- On success: Creates session, sets cookie, redirects to `/`
- On error: Redirects to `/login?error={code}`

**Error Codes:**
| Code | Description |
|------|-------------|
| `missing_token` | No token provided in URL |
| `invalid_token` | Token not found, already used, or expired |
| `not_allowed` | Email not in allowlist |
| `server_error` | Internal server error |

### POST /api/auth/logout

Destroy the current session and clear the session cookie.

**Response:**
```json
{
  "success": true
}
```

### POST /api/auth/passkey/register

Start or complete passkey registration for the signed-in user.

**Request (options):**
```json
{}
```

**Response (options):**
```json
{
  "options": { "challenge": "..." }
}
```

**Request (verification):**
```json
{
  "response": { "id": "...", "rawId": "..." }
}
```

**Response (verification):**
```json
{
  "success": true
}
```

### POST /api/auth/passkey/authenticate

Start or complete passkey authentication.

**Request (options):**
```json
{}
```

**Response (options):**
```json
{
  "options": { "challenge": "..." }
}
```

**Request (verification):**
```json
{
  "response": { "id": "...", "rawId": "..." }
}
```

**Response (verification):**
```json
{
  "success": true
}
```

### Access Control (Allowlist + Invites)

Only emails in the allowlist can request magic links or complete verification. Invites and
allowlist management are owner-only (with limited invite rights for family members).

**Rules:**
- Only allowlisted emails can receive magic links or sign in
- Owner can add/remove allowlist entries directly
- Owner and family can invite new users (family can invite `friend` only)
- Allowlist entries capture the first successful sign-in timestamp

**Owner bootstrap:**
- Set `OWNER_EMAIL` to seed the initial owner allowlist entry

### GET /api/admin/allowlist

List all allowlisted emails (owner only).

### POST /api/admin/allowlist

Add an email to the allowlist (owner only).

### DELETE /api/admin/allowlist/[email]

Remove an email from the allowlist (owner only).

### POST /api/invite

Create an invitation (owner or family).

## Security

### Token Security

| Measure | Implementation |
|---------|----------------|
| Entropy | 32-character nanoid (128 bits) |
| Reuse Prevention | Atomic update with `usedAt: null` condition |
| Expiry | 15-minute TTL |
| Storage | MongoDB with TTL index for automatic cleanup |

### Cookie Security

| Option | Value | Purpose |
|--------|-------|---------|
| `httpOnly` | `true` | Prevent XSS access |
| `secure` | `true` (prod) | HTTPS only in production |
| `sameSite` | `lax` | CSRF protection |
| `path` | `/` | Available site-wide |
| `maxAge` | 7 days | Session duration |

### Passkey Security

| Measure | Implementation |
|---------|----------------|
| Challenge signing | Signed HTTP-only cookie with `JWT_SECRET` |
| Challenge TTL | 5 minutes |
| Origin validation | `NEXT_PUBLIC_APP_URL` |
| RP ID validation | `WEBAUTHN_RP_ID` |
| User verification | Required during registration and authentication |

### Additional Measures

- **Email Enumeration Prevention**: `/api/auth/send` always returns success
- **Atomic Token Usage**: `findOneAndUpdate` prevents race conditions
- **Session TTL**: MongoDB TTL index automatically removes expired sessions

## Database Models

### MagicLink

```typescript
interface IMagicLink {
  email: string;      // Normalized (lowercase, trimmed)
  token: string;      // 32-char nanoid
  expiresAt: Date;    // 15 minutes from creation
  usedAt?: Date;      // Set when token is consumed
  createdAt: Date;
}
```

### Session

```typescript
interface ISession {
  userId: ObjectId;   // Reference to User
  token: string;      // 32-char nanoid
  expiresAt: Date;    // 7 days from creation
  createdAt: Date;
}
```

### Passkey

```typescript
interface IPasskey {
  userId: ObjectId;     // Reference to User
  credentialId: string; // Base64URL credential ID
  publicKey: string;    // Base64URL public key
  counter: number;      // Signature counter
  deviceType?: string;  // singleDevice | multiDevice
  backedUp: boolean;    // Backup state for multi-device credentials
  transports?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}
```

### AllowedEmail

```typescript
interface IAllowedEmail {
  email: string;              // Normalized (lowercase, trimmed)
  role: 'owner' | 'family' | 'friend';
  invitedBy?: ObjectId | null;
  createdAt: Date;
  firstSignedInAt?: Date | null;
}
```

## Usage Examples

### Getting the Current User (Server Component)

```typescript
import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';

export default async function Page() {
  const user = await getSessionFromCookies(await cookies());

  if (!user) {
    // Not authenticated
    redirect('/login');
  }

  return <div>Hello, {user.email}</div>;
}
```

### Getting the Current User (API Route)

```typescript
import { cookies } from 'next/headers';
import { getSessionFromCookies } from '@/lib/auth';

export async function GET() {
  const user = await getSessionFromCookies(await cookies());

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ user });
}
```

### Logout (Client Component)

```typescript
async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}
```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key for Resend email service | `re_xxx...` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | `https://recipes.example.com` |
| `WEBAUTHN_RP_ID` | WebAuthn relying party ID | `recipes.example.com` |
| `JWT_SECRET` | Signs session and passkey challenge cookies | `base64-random` |

### Email Sender

The sender email address is derived from `NEXT_PUBLIC_APP_URL`:
- Production: `noreply@{domain}` (e.g., `noreply@recipes.example.com`)
- Development: `noreply@resend.dev` (Resend's testing domain)

## Testing

### Local Development

1. Set up environment variables in `.env.local`:
   ```
   RESEND_API_KEY=re_xxx...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   WEBAUTHN_RP_ID=localhost
   JWT_SECRET=replace-with-random
   OWNER_EMAIL=you@example.com
   ```

2. Visit `/login` and enter your email or choose passkey sign-in

3. Check your inbox for the magic link (or check Resend dashboard for test emails)

4. After signing in, visit `/settings` to register a passkey

### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Valid email | Magic link sent, "Check your email" shown |
| Non-allowlisted email | Magic link request silently succeeds but no email sent |
| Click valid link | Redirected to `/` with session |
| Click valid link after removal | Redirected to `/login?error=not_allowed` |
| Click expired link | Redirected to `/login?error=invalid_token` |
| Click used link | Redirected to `/login?error=invalid_token` |
| Invalid token | Redirected to `/login?error=invalid_token` |
| Register passkey | Passkey stored and listed in settings |
| Passkey sign-in | Session created and redirected to `/` |
| Logout | Session cleared, cookie removed |

## Future Enhancements

The authentication system is designed to be extensible. Potential future additions:

- **SMS Magic Links**: Add phone number verification
- **TOTP**: Time-based one-time passwords for 2FA
- **Social Login**: OAuth providers (Google, Apple, etc.)
