# PR-043: Technical Design

## Changes

### 1. Backfill API Route (`src/app/api/recipes/backfill-raw-cooklang/route.ts`)

Auth-protected POST endpoint (owner/family role) that:
1. Queries recipes where rawCooklang is missing/null/empty
2. Reads .cook files from `recipes/{filePath}` on disk
3. Falls back to `serializeToCooklang()` if file not found
4. Updates MongoDB with rawCooklang, category, source
5. Returns JSON summary: `{ backfilled, failed, skipped }`

### 2. sync.ts Fix

Add `rawCooklang: source` to the recipe object in `processFile()`.

### 3. repository.ts Fix

Update `backfillRawCooklang()` filter to match `$exists: false`, empty string, and null.

## Files Modified

| File | Change |
|------|--------|
| `src/app/api/recipes/backfill-raw-cooklang/route.ts` | NEW — POST endpoint |
| `src/lib/git-recipes/sync.ts` | Add rawCooklang to processFile() |
| `src/lib/recipes/repository.ts` | Fix filter in backfillRawCooklang() |
