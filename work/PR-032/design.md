# PR-032: MongoDB-Primary Architecture - Design

> **Status**: In Progress
> **Created**: 2026-01-30
> **Updated**: 2026-01-30

---

## Overview

Shift from filesystem-primary to MongoDB-primary architecture. All recipe writes go directly to MongoDB for instant availability. Git becomes a backup/archive mechanism with weekly automated exports and manual export capability.

## Selected Approach

- [ ] Option A: Git-based writes
- [ ] Option B: Local-only writes
- [x] Option C: MongoDB-primary with Git backup
- [ ] Option D: Vercel Blob

---

## Architecture

### New Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         WRITES                                  │
│                                                                 │
│   MCP/API Request                                               │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────┐     ┌─────────────┐                          │
│   │  Validate   │────►│  MongoDB    │  ← Source of truth       │
│   │  Cooklang   │     │  (instant)  │                          │
│   └─────────────┘     └─────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         READS                                   │
│                                                                 │
│   All reads (UI, MCP, API) ─────► MongoDB                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       GIT BACKUP                                │
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  MongoDB    │────►│  Serialize  │────►│   GitHub    │      │
│   │  (read all) │     │  to .cook   │     │   (commit)  │      │
│   └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                 │
│   Triggers:                                                     │
│   - Weekly cron (automated backup)                              │
│   - Manual CLI command                                          │
│   - Admin UI button (future)                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    IDE SYNC (Rare)                              │
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  Git Push   │────►│   GitHub    │────►│  MongoDB    │      │
│   │  (.cook)    │     │   Action    │     │  (upsert)   │      │
│   └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Design

### Phase 1: MongoDB Writes (Core)

#### Schema Changes

The existing `Recipe` model already stores full recipe data. Add a field for raw Cooklang content:

```typescript
// Add to IRecipe interface in src/db/types/index.ts
interface IRecipe {
  // ... existing fields ...

  /** Raw Cooklang source content for serialization */
  rawCooklang: string;

  /** Source of this recipe: 'mcp', 'api', 'sync', 'import' */
  source: 'mcp' | 'api' | 'sync' | 'import';

  /** When recipe was created (not synced) */
  createdAt: Date;

  /** When recipe was last modified */
  updatedAt: Date;
}
```

#### New Write Functions

Create `src/lib/recipes/db-writer.ts`:

```typescript
/**
 * MongoDB-based recipe writer
 *
 * Writes recipes directly to MongoDB for instant availability.
 */

export async function createRecipeInDB(
  content: string,
  category: string,
  source: 'mcp' | 'api'
): Promise<{ success: true; slug: string } | { success: false; error: string }>;

export async function updateRecipeInDB(
  slug: string,
  content: string,
  category: string
): Promise<{ success: true; slug: string } | { success: false; error: string }>;

export async function deleteRecipeInDB(
  slug: string
): Promise<{ success: true } | { success: false; error: string }>;
```

#### Refactor MCP Tools

Update `src/mcp/tools/recipes.ts`:
- `recipe_create`: Call `createRecipeInDB()` instead of `writeRawCooklangContent()`
- `recipe_update`: Call `updateRecipeInDB()` instead of filesystem writer
- Add `recipe_delete`: Call `deleteRecipeInDB()`

#### Refactor API Routes

Update `src/app/api/recipes/route.ts` and `[slug]/route.ts`:
- Replace filesystem writes with DB writes
- Remove dependency on `src/lib/recipes/writer.ts` for production writes

### Phase 2: Git Backup Export

#### Export Function

Create `src/lib/recipes/git-export.ts`:

```typescript
/**
 * Export recipes from MongoDB to GitHub
 */

export interface ExportResult {
  success: boolean;
  recipesExported: number;
  recipesDeleted: number;
  commitSha?: string;
  error?: string;
}

export async function exportRecipesToGitHub(
  options?: {
    dryRun?: boolean;
    message?: string;
  }
): Promise<ExportResult>;
```

Implementation:
1. Fetch all recipes from MongoDB
2. Serialize each to Cooklang format using existing serializer
3. Compare with current GitHub contents (via Contents API)
4. Create/update/delete files as needed
5. Commit all changes in a single commit (via Git Trees API for efficiency)

#### GitHub API Client

Create `src/lib/github/client.ts`:

```typescript
/**
 * GitHub API client for recipe backup
 */

export class GitHubClient {
  constructor(token: string, owner: string, repo: string);

  async getFileContent(path: string): Promise<{ content: string; sha: string } | null>;
  async createOrUpdateFile(path: string, content: string, message: string, sha?: string): Promise<void>;
  async deleteFile(path: string, sha: string, message: string): Promise<void>;
  async createCommitWithMultipleFiles(files: FileChange[], message: string): Promise<string>;
}
```

#### Weekly Cron Job

Option A: Vercel Cron

```typescript
// src/app/api/cron/backup-recipes/route.ts
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: Request) {
  // Verify cron secret
  // Call exportRecipesToGitHub()
  // Log result
}
```

Configure in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/backup-recipes",
    "schedule": "0 0 * * 0"  // Weekly on Sunday at midnight
  }]
}
```

Option B: GitHub Actions (alternative)
- Scheduled workflow that calls the export API endpoint

#### Manual Export CLI

Create `scripts/export-recipes.ts`:

```typescript
#!/usr/bin/env npx tsx
/**
 * Manual recipe export to GitHub
 *
 * Usage: npx tsx scripts/export-recipes.ts [--dry-run]
 */
```

### Phase 3: IDE Sync (GitHub Action)

Create `.github/workflows/sync-recipes-to-db.yml`:

```yaml
name: Sync Recipes to MongoDB

on:
  push:
    paths:
      - 'recipes/**/*.cook'
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Sync changed recipes to MongoDB
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
        run: npx tsx scripts/sync-to-db.ts
```

Create `scripts/sync-to-db.ts`:
- Get list of changed `.cook` files from git
- Parse each file
- Upsert to MongoDB

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/lib/recipes/db-writer.ts` | MongoDB write operations |
| `src/lib/github/client.ts` | GitHub API wrapper |
| `src/lib/recipes/git-export.ts` | Export MongoDB → GitHub |
| `src/app/api/cron/backup-recipes/route.ts` | Weekly backup endpoint |
| `scripts/export-recipes.ts` | Manual export CLI |
| `scripts/sync-to-db.ts` | IDE → DB sync script |
| `.github/workflows/sync-recipes-to-db.yml` | GitHub Action for IDE sync |

### Modified Files

| File | Changes |
|------|---------|
| `src/db/types/index.ts` | Add `rawCooklang`, `source`, timestamps |
| `src/mcp/tools/recipes.ts` | Use DB writer instead of filesystem |
| `src/app/api/recipes/route.ts` | Use DB writer |
| `src/app/api/recipes/[slug]/route.ts` | Use DB writer |
| `src/lib/recipes/loader.ts` | Read from MongoDB instead of filesystem |
| `vercel.json` | Add cron configuration |

### Deprecated (Keep for Local Dev)

| File | Status |
|------|--------|
| `src/lib/recipes/writer.ts` | Keep for local dev/testing only |
| `src/lib/git-recipes/sync.ts` | Inverted: now DB→Git, not Git→DB |

---

## Configuration

### Environment Variables

```bash
# Existing
MONGODB_URI=mongodb+srv://...

# New
GITHUB_TOKEN=ghp_...          # PAT with repo scope
GITHUB_OWNER=tarvy            # Repository owner
GITHUB_REPO=family-recipes    # Repository name
CRON_SECRET=...               # Secret for cron endpoint auth
```

### Vercel Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/backup-recipes",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

---

## Migration Plan

### Step 1: Schema Migration

1. Add new fields to Recipe model (`rawCooklang`, `source`, timestamps)
2. Run migration to populate `rawCooklang` from existing parsed data
3. Backfill `source: 'sync'` for existing recipes

### Step 2: Implement DB Writer

1. Create `db-writer.ts` with create/update/delete functions
2. Add tests for DB writer
3. Refactor MCP tools to use DB writer
4. Refactor API routes to use DB writer

### Step 3: Implement Git Export

1. Create GitHub client
2. Implement export function
3. Create cron endpoint
4. Create CLI script
5. Test full export cycle

### Step 4: Implement IDE Sync

1. Create sync script
2. Create GitHub Action
3. Test push → DB sync flow

### Step 5: Update Reads

1. Update `loader.ts` to read from MongoDB instead of filesystem
2. Remove filesystem dependency from UI paths

---

## Observability

- All DB writes traced with `withTrace()`
- Export jobs logged with summary (count, duration, errors)
- GitHub API calls traced as external dependencies
- Cron job results logged and optionally alerted on failure

---

## Rollback Plan

If issues arise:
1. Disable cron job (remove from vercel.json)
2. Revert MCP/API to filesystem writes
3. Run `syncRecipes()` to repopulate DB from filesystem
4. Debug and re-attempt migration
