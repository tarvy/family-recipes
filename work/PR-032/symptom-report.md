# PR-032: Serverless Write Constraint - Symptom Report

> **Status**: Analysis Complete, Awaiting Decision
> **Created**: 2026-01-30
> **Issue**: MCP recipe write tools fail on Vercel due to read-only filesystem

---

## Problem Statement

User attempted to add a French 75 cocktail recipe via MCP from their phone. The `recipe_create` tool failed with:

```
EROFS: read-only file system, mkdir '/var/task/recipes/cocktails'
```

This revealed a fundamental architectural constraint: **Vercel serverless functions have read-only filesystems**, but the recipe write implementation assumes filesystem access.

---

## Current Architecture

### Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR LOCAL MACHINE                           │
│  recipes/                                                           │
│  ├── breakfast/*.cook     ← Source of truth (Cooklang files)       │
│  ├── cocktails/*.cook                                               │
│  ├── entrees/*.cook                                                 │
│  └── ...                                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                         git push
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          GITHUB                                     │
│  tarvy/family-recipes repository                                    │
│  - Stores all .cook files in version control                        │
│  - Triggers Vercel deployment on push                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                     deploy webhook
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Production)                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Build Phase (has filesystem access)                         │   │
│  │  - Clones repo including recipes/ directory                  │   │
│  │  - Bundles everything into deployment artifact               │   │
│  │  - recipes/ files are READ-ONLY after this point             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Runtime (Serverless Functions) - READ-ONLY FILESYSTEM       │   │
│  │                                                               │   │
│  │  /var/task/                    ← process.cwd()               │   │
│  │  ├── recipes/                  ← Bundled at build, immutable │   │
│  │  │   ├── entrees/*.cook                                       │   │
│  │  │   └── ...                                                  │   │
│  │  ├── .next/                    ← Build output                │   │
│  │  └── node_modules/                                            │   │
│  │                                                               │   │
│  │  Serverless Functions:                                        │   │
│  │  - /api/recipes (POST/PUT)     → Tries to write, FAILS       │   │
│  │  - /mcp (recipe_create)        → Tries to write, FAILS       │   │
│  │  - /api/recipes/sync           → Reads files, syncs to DB    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       MONGODB ATLAS                                 │
│  recipes collection                                                 │
│  - Stores parsed metadata for search/filtering                      │
│  - Populated by /api/recipes/sync                                   │
│  - Secondary data store (derived from .cook files)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Two Read Paths

### Path 1: Direct Filesystem (for UI)

```
src/lib/recipes/loader.ts
├── getAllRecipes()     → Scans recipes/ directory
├── getRecipeBySlug()   → Reads specific .cook file
└── getCategories()     → Returns hardcoded list (currently)
```

This reads `.cook` files directly from the filesystem. On Vercel, these files exist because they were bundled at build time. **Reading works fine.**

### Path 2: MongoDB (for Search)

```
src/lib/git-recipes/sync.ts
├── scanCooklangFiles() → Finds all .cook files
├── parseCooklang()     → Parses each file
└── Recipe.upsert()     → Writes to MongoDB
```

The sync process reads files and populates MongoDB. This also works because it's reading, not writing.

---

## The Broken Write Path

```
src/lib/recipes/writer.ts
├── writeRawCooklangContent()
│   ├── fs.mkdir(categoryDir)     ← FAILS: Read-only filesystem
│   └── fs.writeFile(filePath)    ← FAILS: Read-only filesystem
└── deleteRecipeFile()
    └── fs.unlink(filePath)       ← FAILS: Read-only filesystem
```

### Why it fails

1. Vercel serverless functions run in an ephemeral, read-only environment
2. The only writable location is `/tmp`, which is:
   - Ephemeral (cleared between invocations)
   - Not shared between function instances
   - Not persisted to git
3. `process.cwd()` returns `/var/task` which is the read-only deployment bundle

### The error

```
EROFS: read-only file system, mkdir '/var/task/recipes/cocktails'
```

This is Node.js failing to create a directory because `/var/task` is immutable.

---

## What Currently Works vs. Doesn't

| Operation | Local Dev | Vercel Production |
|-----------|-----------|-------------------|
| Read recipes | ✅ | ✅ (bundled files) |
| Search recipes | ✅ | ✅ (via MongoDB) |
| List categories | ✅ | ✅ |
| Create recipe | ✅ | ❌ EROFS |
| Update recipe | ✅ | ❌ EROFS |
| Delete recipe | ✅ | ❌ EROFS |
| Sync to MongoDB | ✅ | ✅ (reads only) |

---

## The Philosophical Tension

The architecture embodies a **Cooklang-first philosophy**:

1. **`.cook` files are the source of truth** - Human-readable, version-controlled, portable
2. **MongoDB is derived data** - Populated by sync, used for search
3. **Git provides history** - Every recipe change is a commit

This is a great design for:
- Version control and history
- Portability (export your whole recipe collection as text files)
- Human editability (edit recipes in any text editor)
- Collaboration (PRs for recipe changes)

But it conflicts with:
- **Serverless deployment** - No persistent filesystem
- **Mobile/remote editing** - Can't write to git from a phone easily
- **Real-time updates** - Changes require deploy cycle

---

## Why the MCP Write Tools Were Doomed

When `recipe_create` and `recipe_update` were implemented (PR-029, PR-030), they used the existing `writeRawCooklangContent()` function which does:

```typescript
const categoryDir = path.join(process.cwd(), RECIPES_DIRECTORY, category);
await fs.mkdir(categoryDir, { recursive: true });  // ← Fails on Vercel
await fs.writeFile(filePath, content, 'utf-8');    // ← Would also fail
```

This works perfectly when:
- Running `npm run dev` locally
- Running the MCP server locally

But fails when:
- The MCP server runs on Vercel (production)
- API routes run on Vercel

---

## The Core Decision

### Keep Cooklang files as source of truth?

If yes, writes must flow through git:
- **Option A**: GitHub API commits (MCP → GitHub → Vercel redeploy)
- **Option B**: Local-only writes (run MCP server on your machine)

### Or allow MongoDB to be source of truth for new recipes?

If yes:
- **Option C**: Write to MongoDB first, sync to git later
- **Option D**: Abandon filesystem entirely, store Cooklang content in MongoDB

---

## Option Details

### Option A: Git-based writes (recommended for Cooklang-first)

**How it works:**
- MCP/API writes create a commit via GitHub API
- Vercel auto-deploys on push, picking up new recipes
- Recipes stay in version control

**Pros:**
- Preserves Cooklang file-first philosophy
- Full version history
- Works from anywhere (phone, laptop, etc.)

**Cons:**
- Slight delay between write and availability (~30-60s for deploy)
- Requires GitHub App or PAT for API access
- More complex implementation

### Option B: Local MCP only

**How it works:**
- Accept that write tools only work when running locally
- Phone/remote use cases fall back to web UI or manual git

**Pros:**
- Simplest implementation (already works locally)
- No additional infrastructure

**Cons:**
- Defeats the purpose of mobile recipe adding
- Limited to when you're at your computer

### Option C: Database-first with file sync

**How it works:**
- Writes go to MongoDB immediately (available instantly)
- A separate process syncs DB → git repo periodically
- Files become "generated" from database

**Pros:**
- Fast writes, immediate availability
- Works from anywhere

**Cons:**
- Inverts source of truth (DB becomes primary)
- Adds complexity (bidirectional sync)
- Potential for conflicts

### Option D: Vercel Blob Storage

**How it works:**
- Store `.cook` files in Vercel Blob instead of filesystem
- Works with serverless, persistent storage

**Pros:**
- Works with serverless
- Relatively simple migration

**Cons:**
- Moves away from git-based storage
- Loses version control benefits
- Vendor lock-in

---

## Summary of Constraints

1. **Vercel serverless = read-only filesystem** (fundamental platform constraint)
2. **Current write functions assume filesystem access** (architectural assumption)
3. **Cooklang files in git = source of truth** (design choice, and a good one)
4. **MCP server runs on Vercel** (deployment choice)
5. **User wants to add recipes from phone** (user requirement)

The tension is between #3 (files as source of truth) and #4/#5 (serverless remote access). Something has to give.

---

## Files Involved

| File | Role |
|------|------|
| `src/lib/recipes/writer.ts` | Write functions that fail on Vercel |
| `src/lib/recipes/loader.ts` | Read functions (work fine) |
| `src/lib/git-recipes/sync.ts` | Filesystem → MongoDB sync |
| `src/mcp/tools/recipes.ts` | MCP tools that call writer |
| `src/app/api/recipes/route.ts` | API routes that call writer |
| `src/app/api/recipes/[slug]/route.ts` | API routes that call writer |

---

## Decision Outcome

**Selected: Option C — MongoDB-primary with Git backup**

### Rationale

After discussing Option A (GitHub API commits), the user realized that deploy-on-every-write (30-60s latency) conflicted with the core need: **live data for automations**.

Key insights from discussion:
- User wants instant read-after-write, not deploy cycles
- Recipes should behave like data, not code artifacts
- App UI will be the primary editing interface
- IDE editing is rare and can be handled via GitHub Action
- Git becomes backup/archive, not the bottleneck

### Final Architecture

- **Source of truth**: MongoDB (instant writes, live queries)
- **Backup**: Weekly cron export to GitHub + manual CLI
- **Rare path**: GitHub Action syncs IDE edits → MongoDB

See `requirements.md` and `design.md` for full implementation plan.

---

## Status

This symptom report is now **resolved**. Keep for historical context or delete after PR-032 implementation is complete.
