# PR-038: MCP Operability Documentation - Progress & Agent Handoff

> **Status**: Not Started
> **Started**: 2026-02-21
> **Target**: 2026-02-21
> **Branch**: `feat/038-mcp-operability-docs`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | work/PR-038/requirements.md |
| Design | [x] Draft [ ] Review [ ] Approved | work/PR-038/design.md |
| Implementation | [ ] Not Started [ ] In Progress [ ] Complete | Doc edits only |
| Testing | [ ] N/A (docs) | Manual read-through |
| Documentation | [ ] Updated [ ] Reviewed | This PR is the doc update |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | Delete work/PR-038/ when complete |

---

## Deliverables Checklist

From `scripts/deliverables.yaml`:

- [ ] `docs/ENVIRONMENT.md` - MCP section aligned with OAuth-only; no MCP_API_KEY
- [ ] `docs/ARCHITECTURE.md` - Security bullet: MCP uses OAuth 2.1 Bearer
- [ ] `docs/MCP.md` - "Making MCP operable" section added

---

## Implementation Phases

### Phase 1: MCP documentation alignment and operability guide

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] docs/ENVIRONMENT.md (MCP subsection replaced)
- [ ] docs/ARCHITECTURE.md (Security bullet updated)
- [ ] docs/MCP.md ("Making MCP operable" section added)

**Agent Prompt**:
```
Context:
- Read: work/PR-038/requirements.md, work/PR-038/design.md
- Reference: docs/MCP.md, docs/ENVIRONMENT.md, docs/ARCHITECTURE.md
- Implementation: src/lib/oauth/mcp-auth.ts uses only OAuth Bearer (no API key)

Task:
1. docs/ENVIRONMENT.md
   - Remove the "MCP Server" subsection that documents MCP_API_KEY and x-api-key.
   - Add a replacement "MCP Server" subsection that:
     - States MCP auth is OAuth 2.1 only (no API key implemented).
     - Lists required for MCP: JWT_SECRET, NEXT_PUBLIC_APP_URL (and note app env e.g. MongoDB so tools work).
     - Lists optional: OAUTH_ISSUER, OAUTH_REGISTRATION_SECRET, OWNER_EMAIL with one-line descriptions.
     - Points to docs/MCP.md for full MCP setup.

2. docs/ARCHITECTURE.md
   - In the Security section, replace the bullet "All routes behind auth middleware (except public MCP with API key)" with: "All routes behind auth middleware; MCP uses OAuth 2.1 Bearer tokens (see docs/MCP.md)."

3. docs/MCP.md
   - After the existing "Environment" table, add a new section "Making MCP operable" with:
     a. Required environment: JWT_SECRET, NEXT_PUBLIC_APP_URL; note app must be runnable (MongoDB, etc.).
     b. Optional MCP env: OAUTH_ISSUER, OAUTH_REGISTRATION_SECRET, OWNER_EMAIL.
     c. OAuth client registration (one-time): curl example for POST /api/mcp/oauth/register with client_name and redirect_uris.
     d. Client configuration: MCP endpoint URL ({NEXT_PUBLIC_APP_URL}/mcp), auth = OAuth 2.1 with PKCE, discovery URLs; Cursor/Claude: add server with URL and OAuth, first use opens browser for login/consent.
   - Do not remove or contradict existing "Usage with Claude Code" or "Example (MCP SDK Client with OAuth)"; cross-link if helpful.

Verification:
- [ ] ENVIRONMENT.md has no MCP_API_KEY or x-api-key as supported.
- [ ] ARCHITECTURE.md Security says MCP uses OAuth 2.1 Bearer.
- [ ] MCP.md "Making MCP operable" is present and covers env → registration → client config.
- [ ] npm run lint && npm run typecheck (no code changes; should remain passing).

Output:
- Files modified: docs/ENVIRONMENT.md, docs/ARCHITECTURE.md, docs/MCP.md
```

---

## Test Plan

No automated tests for doc-only changes.

### Manual Verification

| Check | Expected | Status |
|-------|----------|--------|
| ENVIRONMENT.md MCP section | OAuth-only vars; no MCP_API_KEY | [ ] |
| ARCHITECTURE Security | "MCP uses OAuth 2.1 Bearer" | [ ] |
| MCP.md operability section | Env → registration → client config | [ ] |
| Lint/typecheck | Pass | [ ] |

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables in scripts/deliverables.yaml
- [ ] npm run lint - pass
- [ ] npm run typecheck - pass
- [ ] python scripts/progress.py - PR-038 complete

### Quality Checks
- [ ] Docs read clearly; no orphaned references
- [ ] README.md / doc index links still valid

---

## Session Log

(To be filled as work proceeds.)

---

## Cleanup Checklist

Before marking PR complete:

- [ ] Delete work/PR-038/ directory
- [ ] Ensure docs/ is the only permanent change
- [ ] Verify .progress.json shows PR-038 complete
- [ ] Final npm run lint && npm run typecheck
