# PR-065: MCP OAuth Sign-in Loop - Progress

> **Status**: Ready for review
> **Branch**: `fix/mcp-oauth-loop`

## Phases

- [x] Phase 1: `return_to` sanitizer + magic link / passkey / middleware / status cookie
- [x] Phase 2: `/mcp` requires a valid token on every request; WWW-Authenticate
- [x] Phase 3: DCR public clients (`token_endpoint_auth_method: none`)
- [x] Phase 4: Tests (`src/lib/auth/__tests__`, `src/lib/oauth/__tests__`) + docs (`docs/MCP.md`, `docs/AUTH.md`)

## Verification

- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`

## Session log

- 2026-10-01: Implemented. Numbered PR-065 because PR-063/PR-064 were reserved
  as follow-ups in PR-061's session log. Deferred: refresh-token reuse grace
  window; stale-cookie loop on `(main)` routes (layout redirects to `/login`,
  middleware bounces back) outside the OAuth flow.
