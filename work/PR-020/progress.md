# PR-020: Secret Remediation & Deployment Hygiene - Progress & Agent Handoff

> **Status**: In Progress
> **Started**: 2026-01-26
> **Target**: 2026-01-27
> **Branch**: `chore/020-secret-remediation`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Draft [ ] Review [ ] Approved | Initial capture of remediation tasks |
| Design | [x] Draft [ ] Review [ ] Approved | High-level operational plan |
| Implementation | [ ] Not Started [x] In Progress [ ] Complete | |
| Testing | [ ] Unit [ ] Integration [ ] E2E | Manual verification only |
| Documentation | [x] Updated [ ] Reviewed | |
| Cleanup | [ ] Temp files removed [ ] Ready for merge | | 

---

## Deliverables Checklist

- [x] Rotate MongoDB Atlas credentials and update Vercel env vars
- [x] Verify production/preview deploys connect successfully
- [x] Rewrite git history to remove leaked URI
- [x] Close GitHub secret-scanning alert #1
- [x] Ensure GitHub Actions deploy + Terraform plan/apply use GitHub Secrets
- [x] Update docs to reflect GitHub Secrets usage

---

## Implementation Phases

### Phase 1: Rotate credentials + update Vercel env

**Dependencies**: None (can start immediately)

**Deliverables**:
- [x] New MongoDB Atlas credentials created
- [x] Vercel env vars updated
- [x] Old credentials invalidated

**Agent Prompt**:
```
Context:
- Read: docs/ENVIRONMENT.md, docs/DEVELOPMENT.md
- Reference: work/PR-020/requirements.md, work/PR-020/design.md

Task:
1. Rotate MongoDB Atlas credentials (prefer new user + delete old).
2. Update Vercel env vars with new MONGODB_URI.
3. Verify app connects with new credentials.

Verification:
- [ ] Production deploy succeeds in Vercel
- [ ] Old credentials fail connection

Output:
- Notes recorded in work/PR-020/progress.md session log
```

---

### Phase 2: Purge secret from git history

**Dependencies**: Phase 1

**Deliverables**:
- [x] Leaked URI removed from git history
- [x] Force-push completed
- [x] Secret-scanning alert closed

**Agent Prompt**:
```
Context:
- Read: work/PR-020/requirements.md
- Use git filter-repo (preferred) to remove secret string

Task:
1. Rewrite history to remove the leaked URI.
2. Force-push main branch.
3. Confirm the alert is resolved and close it with a note.

Verification:
- [ ] No matches for the leaked URI in git history
- [ ] GitHub secret-scanning alert closed
```

---

### Phase 3: Align CI/CD with GitHub Secrets

**Dependencies**: None

**Deliverables**:
- [x] Deploy workflow uses Vercel CLI with GitHub Secrets
- [x] Terraform plan/apply uses GitHub Secrets
- [x] Documentation updated

**Agent Prompt**:
```
Task:
1. Ensure deploy workflow uses GitHub Secrets.
2. Ensure Terraform plan/apply uses GitHub Secrets.
3. Update docs to describe required GitHub Secrets.

Verification:
- [ ] docs/DEVELOPMENT.md lists required secrets
```

---

## Session Log

### Session 1 - 2026-01-26

**Agent**: Codex
**Duration**: 20 minutes

**Completed**:
- [x] Drafted PR-020 requirements/design/progress documents

### Session 2 - 2026-01-26

**Agent**: Codex
**Duration**: 25 minutes

**Completed**:
- [x] Restored GitHub Actions deploy workflow with Vercel CLI
- [x] Restored Terraform plan/apply workflows using GitHub Secrets
- [x] Updated docs to reflect GitHub Secrets usage
- [x] Updated PR-020 docs to match path 1 decision

### Session 3 - 2026-01-26

**Agent**: Codex
**Duration**: 10 minutes

**Completed**:
- [x] Verified Vercel CLI access via `npx vercel`

**Blocked**:
- Atlas credential rotation requires manual action or Atlas API keys

### Session 4 - 2026-01-26

**Agent**: Codex
**Duration**: 20 minutes

**Completed**:
- [x] Created Atlas DB user `family_recipes_app_20260126` with readWrite on `family_recipes`
- [x] Rotated password and updated Vercel `MONGODB_URI` (preview + production)
- [x] Updated local `.env.local` with new URI
- [x] Deleted legacy Atlas DB user `app`
- [x] Verified MongoDB connectivity with `mongosh` ping

### Session 5 - 2026-01-26

**Agent**: Codex
**Duration**: 30 minutes

**Completed**:
- [x] Added Grafana API helper script and documentation
- [x] Set missing GitHub Secrets (`GRAFANA_URL`, `GRAFANA_CLOUD_STACK_SLUG`, `VERCEL_TEAM_ID`)
- [x] Rewrote git history to purge leaked URI and force-pushed main
- [x] Resolved GitHub secret-scanning alert #1
