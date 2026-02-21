# PR-038: MCP Operability Documentation - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-21
> **Author**: Agent

---

## Overview

Documentation-only change: align ENVIRONMENT.md and ARCHITECTURE.md with the actual MCP implementation (OAuth 2.1 Bearer only), remove or correct the non-existent MCP_API_KEY / x-api-key references, and add a "Making MCP operable" section to MCP.md so operators have a single, accurate path to get MCP working.

---

## Scope

| Document | Change |
|----------|--------|
| `docs/ENVIRONMENT.md` | Replace "MCP Server" subsection: remove MCP_API_KEY / x-api-key; document only OAuth-related and MCP-relevant vars (JWT_SECRET, NEXT_PUBLIC_APP_URL, OAUTH_ISSUER, OAUTH_REGISTRATION_SECRET, OWNER_EMAIL). Optionally add a one-line pointer to docs/MCP.md for full MCP setup. |
| `docs/ARCHITECTURE.md` | In Security section, replace "except public MCP with API key" with wording that MCP is secured via OAuth 2.1 Bearer tokens (and reference docs/MCP.md). |
| `docs/MCP.md` | Add a **Making MCP operable** section (after Environment or before Usage with Claude Code) with: (1) Required environment variables for MCP, (2) One-time OAuth client registration step, (3) Client configuration (Cursor / Claude Code) with endpoint URL and auth flow. Keep existing OAuth flow, Tools, and Security content unchanged. |

---

## Data Flow (Reader Journey)

```
Operator reads MCP.md
  → "Making MCP operable" section
  → 1. Set JWT_SECRET, NEXT_PUBLIC_APP_URL (and app env: MongoDB, etc.)
  → 2. Register OAuth client (POST /api/mcp/oauth/register)
  → 3. Configure Cursor/Claude with /mcp URL and OAuth
  → First tool use triggers browser login → consent → tools available
```

---

## File Structure

No new files. Modifications only:

```
docs/
├── ENVIRONMENT.md   # MCP section: OAuth-only vars, no MCP_API_KEY
├── ARCHITECTURE.md # Security bullet: MCP auth = OAuth 2.1 Bearer
└── MCP.md          # New "Making MCP operable" subsection
```

---

## Content Spec: ENVIRONMENT.md MCP Section

**Remove:** Entire "MCP Server" subsection that documents `MCP_API_KEY` and `x-api-key`.

**Replace with:** Short MCP subsection stating:
- MCP authentication uses OAuth 2.1; no API key is implemented.
- Required for MCP: `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` (and standard app env so tools work).
- Optional: `OAUTH_ISSUER`, `OAUTH_REGISTRATION_SECRET`, `OWNER_EMAIL` (brief purpose each).
- Point to **docs/MCP.md** for full setup (env checklist, client registration, client config).

---

## Content Spec: ARCHITECTURE.md Security Bullet

**Current:** "All routes behind auth middleware (except public MCP with API key)"

**New:** "All routes behind auth middleware; MCP uses OAuth 2.1 Bearer tokens (see docs/MCP.md)."

---

## Content Spec: MCP.md "Making MCP operable"

**Placement:** After the existing "Environment" table, before "Tools" (or after "Security" if preferred; same info).

**Structure:**
1. **Required environment**
   - List: JWT_SECRET (required), NEXT_PUBLIC_APP_URL, and note that app must be runnable (MongoDB, etc.) so tools work.
2. **Optional MCP env**
   - OAUTH_ISSUER, OAUTH_REGISTRATION_SECRET, OWNER_EMAIL (one line each).
3. **OAuth client registration (one-time)**
   - curl example: POST /api/mcp/oauth/register with client_name and redirect_uris; note that Cursor/Claude may use a specific callback (e.g. localhost).
4. **Client configuration**
   - MCP endpoint: `{NEXT_PUBLIC_APP_URL}/mcp`.
   - Auth: OAuth 2.1 with PKCE; discovery at `/.well-known/oauth-authorization-server` or `/api/mcp/.well-known/oauth-authorization-server`.
   - Cursor: Add server in MCP settings with URL and OAuth; first use opens browser for login and consent.
   - Claude Code: reference existing "Usage with Claude Code" (or fold into this section).

Keep existing "Usage with Claude Code" and "Example (MCP SDK Client with OAuth)" as-is or lightly cross-link from the new section.

---

## Dependencies

- None. No code or package changes.

---

## Verification

- [ ] ENVIRONMENT.md: no mention of MCP_API_KEY or x-api-key as supported; MCP vars match implementation.
- [ ] ARCHITECTURE.md: Security bullet says MCP uses OAuth 2.1 Bearer, not API key.
- [ ] MCP.md: "Making MCP operable" present and walks env → registration → client config; no API key steps.
- [ ] `npm run lint` and `npm run typecheck` (no code changes; docs only).
- [ ] README.md or docs index: no broken links (MCP.md already linked from AGENTS.md/ARCHITECTURE).

---

## Alternatives Considered

- **Implement API key auth:** Deferred; doc-only scope. A future PR can add optional x-api-key and then document it.
- **Leave ENVIRONMENT as-is:** Rejected; misleading (documents unsupported auth).
