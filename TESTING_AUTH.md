# Testing Signup and Login Flows

Based on the magic link authentication implementation, here's the current state of the auth testing setup.

## Current State

### What's Working
- [x] Login page exists at `/login`
- [x] Owner-only manual magic-link generation
- [x] Session creation and management
- [x] Logout API endpoint exists
- [x] **Navigation to Login Page** - Sign In link on home page when not authenticated
- [x] **User Authentication Status Display** - Home page shows current user's email and role
- [x] **Logout UI** - Sign Out button on home page when authenticated
- [x] Passkey revocation with confirmation

### Not Yet Implemented
- [ ] Protected route example (page that redirects unauthenticated users)
- [x] CLI test path for manually generated magic links

## Test Checklist

### Signup Flow (First-time User)
- [ ] Navigate to home page (`/`)
- [ ] Click "Sign In" link
- [ ] Owner generates a link for the allowlisted email in Settings
- [ ] Copy and open the generated magic link
- [ ] Verify redirect to home page
- [ ] Verify user email is displayed on home page
- [ ] Check database: user should be created with `role: 'family'`

### Login Flow (Existing User)
- [ ] Click "Sign Out" on home page (or clear cookies)
- [ ] Click "Sign In" link
- [ ] Owner generates a link for the existing allowlisted email
- [ ] Copy and open the generated magic link
- [ ] Verify redirect to home page
- [ ] Verify user email is displayed

### Logout Flow
- [ ] While logged in, click "Sign Out" button
- [ ] Verify redirect to login page
- [ ] Navigate to home page
- [ ] Verify "Sign In" link appears (not user info)

### Error Cases
- [ ] Invalid email format → Should show error
- [ ] Expired token → Should redirect to `/login?error=expired`
- [ ] Used token (click link twice) → Should redirect to `/login?error=invalid_token`
- [ ] Missing token → Should redirect to `/login?error=missing_token`
- [ ] Revoke a passkey → Credential disappears and can no longer authenticate

## Environment Setup

Required in `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
```

## Notes

- Magic links expire in 15 minutes
- Sessions last 7 days
- Only authenticated owners can generate links
- First user gets `role: 'family'` (can be promoted to 'owner' later)
- Magic links are single-use (marked as used after verification)
