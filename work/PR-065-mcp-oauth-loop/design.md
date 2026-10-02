# PR-065: MCP OAuth Sign-in Loop - Design

## Root causes (confirmed)

1. `/mcp` treated `initialize`, `ping`, `notifications/initialized` as
   unauthenticated (and ignored an invalid token on them), so `initialize`
   returned 200 while `tools/list` returned 401.
2. Magic-link login dropped `return_to` (`/api/auth/verify` always redirected
   to `/recipes`), so the consent page was never reached and no code issued.
   Passkey kept `return_to` but accepted absolute URLs (open redirect).
   Middleware bounced `/login` to `/recipes` with any session cookie, ignoring
   `return_to`, and stale cookies could loop.
3. DCR always issued a `client_secret` and ignored
   `token_endpoint_auth_method`, although metadata advertised `none`.

## Approach

- `src/lib/auth/return-to.ts`: pure `sanitizeReturnTo` (same-origin relative
  paths only). Used by the login page, `/api/auth/send` → magic-link URL →
  `/api/auth/verify`, passkey redirect, and middleware.
- `/api/auth/status` clears a stale session cookie so middleware can safely
  honor `return_to`.
- `/mcp`: authenticate every request before parsing; 401 + RFC 6750/9728
  challenge built by `buildWwwAuthenticate`. Resource URL derived from the
  same source as the metadata route.
- DCR: honor `token_endpoint_auth_method` (`none` → `clientSecretHash: null`,
  which the token endpoint already treats as "no secret required"). Return
  RFC 7591 fields. No schema change.
