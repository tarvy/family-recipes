# PR-032: MongoDB-Primary Architecture - Progress

> **Status**: Ready for Implementation
> **Started**: 2026-01-30
> **Target**: TBD

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Analysis | [x] Complete | See symptom-report.md |
| Decision | [x] Complete | Option C selected (MongoDB-primary) |
| Requirements | [x] Complete | Acceptance criteria defined |
| Design | [x] Complete | Technical design documented |
| Implementation | [ ] Pending | |
| Testing | [ ] Pending | |

---

## Implementation Phases

### Phase 1: MongoDB Writes (Core)
- [ ] Add `rawCooklang` and `source` fields to Recipe schema
- [ ] Create `src/lib/recipes/db-writer.ts`
- [ ] Refactor MCP tools to use DB writer
- [ ] Refactor API routes to use DB writer
- [ ] Add `recipe_delete` MCP tool

### Phase 2: Git Backup Export
- [ ] Create `src/lib/github/client.ts`
- [ ] Create `src/lib/recipes/git-export.ts`
- [ ] Create cron endpoint for weekly backup
- [ ] Create manual export CLI script

### Phase 3: IDE Sync (GitHub Action)
- [ ] Create `scripts/sync-to-db.ts`
- [ ] Create `.github/workflows/sync-recipes-to-db.yml`

### Phase 4: Update Reads
- [ ] Update `loader.ts` to read from MongoDB
- [ ] Remove filesystem dependency from UI

### Phase 5: Migration
- [ ] Backfill `rawCooklang` for existing recipes
- [ ] Deploy and verify

---

## Session Log

### 2026-01-30 - Initial Analysis

- Identified root cause: Vercel serverless read-only filesystem
- Documented current architecture and data flow
- Outlined four solution options (A: GitHub API, B: Local-only, C: DB-primary, D: Vercel Blob)
- Created symptom-report.md with full analysis

### 2026-01-30 - Decision: Option A (GitHub API)

- Initially selected Option A (Git-based writes via GitHub API)
- Documented acceptance criteria and technical design

### 2026-01-30 - Decision Changed: Option C (MongoDB-Primary)

- User reconsidered after discussing implications
- Key insight: Deploy-on-every-write (30-60s latency) conflicts with desire for live data
- User wants real-time read-after-write for automations, schedules, exports
- User comfortable with DB as source of truth, git as backup
- Weekly cron for automated backup, manual export CLI for on-demand
- GitHub Action for rare IDE editing scenario

**Final decision: MongoDB-primary with Git backup (Option C)**

- Updated requirements.md with new acceptance criteria
- Updated design.md with MongoDB-primary architecture
- Ready for implementation
