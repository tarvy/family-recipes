# Testing Signup and Login Flows

Based on the magic link authentication implementation, here's the current state of the auth testing setup.

## Current State

### What's Working
- [x] Login page exists at `/login`
- [x] Email input form with validation
- [x] Magic link generation and email sending (via Resend)
- [x] Session creation and management
- [x] Logout API endpoint exists
- [x] **Navigation to Login Page** - Sign In link on home page when not authenticated
- [x] **User Authentication Status Display** - Home page shows current user's email and role
- [x] **Logout UI** - Sign Out button on home page when authenticated

### Not Yet Implemented
- [ ] Protected route example (page that redirects unauthenticated users)
- [ ] Dev-only test endpoint for magic links (optional, can check email)

## Test Checklist

### Signup Flow (First-time User)
- [ ] Navigate to home page (`/`)
- [ ] Click "Sign In" link
- [ ] Enter email address
- [ ] Click "Send magic link"
- [ ] Verify "Check your email" message appears
- [ ] Check email inbox for magic link
- [ ] Click magic link in email
- [ ] Verify redirect to home page
- [ ] Verify user email is displayed on home page
- [ ] Check database: user should be created with `role: 'family'`

### Login Flow (Existing User)
- [ ] Click "Sign Out" on home page (or clear cookies)
- [ ] Click "Sign In" link
- [ ] Enter existing user's email
- [ ] Click "Send magic link"
- [ ] Verify "Check your email" message appears
- [ ] Check email for magic link
- [ ] Click magic link
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

## Environment Setup

Required in `.env.local`:
```env
RESEND_API_KEY=re_xxx...
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
```

## Notes

- Magic links expire in 15 minutes
- Sessions last 7 days
- Email enumeration is prevented (always returns success)
- First user gets `role: 'family'` (can be promoted to 'owner' later)
- Magic links are single-use (marked as used after verification)
- **Resend free tier**: Can only send to the email you signed up with (or verify a custom domain)
