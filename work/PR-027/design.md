# PR-027: Cooklang Metadata Handling Consolidation - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-29
> **Author**: Claude Code

---

## Overview

Refactor Cooklang metadata handling to eliminate duplication between `parser.ts` and `metadata.ts`. Leverage the `@cooklang/cooklang-ts` library's built-in metadata parsing instead of custom regex-based extraction. Create a clear separation between parsing (library) and transformation (our code).

---

## Architecture

### Current State (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT: Duplicated Logic                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  .cook file ──┬──► parser.ts                                │
│               │    └── CooklangRecipe(source)               │
│               │        └── cooklang.metadata (library)      │
│               │            └── Manual field mapping         │
│               │                                              │
│               └──► metadata.ts                              │
│                    └── extractMetadataFromContent()         │
│                        └── REGEX parsing (duplicate!)       │
│                    └── splitMetadataAndBody()               │
│                        └── More REGEX (duplicate!)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Target State (After)

```
┌─────────────────────────────────────────────────────────────┐
│                    TARGET: Single Source of Truth            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  .cook file ──► CooklangRecipe(source)  [Library]           │
│                        │                                     │
│                        ▼                                     │
│               recipe.metadata (Record<string, string>)      │
│                        │                                     │
│                        ▼                                     │
│               transformMetadata()  [Our Code]               │
│               ├── normalizeMetadataKey() (aliases)          │
│               ├── parseTimeString() (time values)           │
│               └── parseServings() (servings values)         │
│                        │                                     │
│                        ▼                                     │
│               CooklangMetadata / IRecipe                    │
│                                                              │
│  Body extraction: Use library's recipe.steps + metadata     │
│  instead of splitMetadataAndBody() regex                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Before | After |
|-----------|--------|-------|
| `parser.ts` | Parse + transform metadata | Use library, call shared transform |
| `metadata.ts` | Regex extraction + transform | Transform only (no parsing) |
| Library | Underutilized | Primary parser |

---

## Implementation Strategy

### Step 1: Create Shared Transformation Layer

```typescript
// src/lib/cooklang/metadata-transform.ts (new file)

import { normalizeMetadataKey, parseTimeString } from './constants';
import type { CooklangMetadata } from './metadata';

/**
 * Transform raw library metadata into structured CooklangMetadata
 * Single source of truth for metadata interpretation
 */
export function transformRawMetadata(
  raw: Record<string, string>
): CooklangMetadata {
  const result: CooklangMetadata = { title: '' };

  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = normalizeMetadataKey(key);
    applyMetadataField(result, normalizedKey, value);
  }

  return result;
}

function applyMetadataField(
  metadata: CooklangMetadata,
  key: string,
  value: string
): void {
  switch (key) {
    case 'title':
      metadata.title = value;
      break;
    case 'servings':
      metadata.servings = parseServings(value);
      break;
    case 'prep time':
      metadata.prepTime = parseTimeString(value);
      break;
    // ... etc
  }
}
```

### Step 2: Refactor parser.ts

```typescript
// Before (parser.ts)
const metadata = cooklang.metadata;
const title = metadata['title'] || titleFromFilePath(context.filePath);
// ... manual field extraction

// After (parser.ts)
import { transformRawMetadata } from './metadata-transform';

const structuredMetadata = transformRawMetadata(cooklang.metadata);
const title = structuredMetadata.title || titleFromFilePath(context.filePath);
```

### Step 3: Simplify metadata.ts

```typescript
// Before: extractMetadataFromContent uses regex
export function extractMetadataFromContent(content: string): CooklangMetadata {
  const lines = content.split('\n');
  // ... regex parsing
}

// After: extractMetadataFromContent uses library
import { Recipe } from '@cooklang/cooklang-ts';
import { transformRawMetadata } from './metadata-transform';

export function extractMetadataFromContent(content: string): CooklangMetadata {
  const recipe = new Recipe(content);
  return transformRawMetadata(recipe.metadata);
}
```

### Step 4: Rethink splitMetadataAndBody

```typescript
// Option A: Remove entirely, reconstruct from library
// The library gives us steps (body) and metadata separately

// Option B: Keep as convenience wrapper
export function splitMetadataAndBody(content: string): ContentParts {
  const recipe = new Recipe(content);
  const metadata = transformRawMetadata(recipe.metadata);

  // Reconstruct body from steps
  // Note: This loses original formatting - may need to keep regex for this
  const body = recipe.toCooklang().replace(/^>>.*\n*/gm, '').trim();

  return { metadata, body };
}
```

---

## File Structure

```
src/lib/cooklang/
├── constants.ts          # METADATA_KEYS, ALIASES, parseTimeString
├── metadata-transform.ts # NEW: transformRawMetadata()
├── metadata.ts           # SIMPLIFIED: thin wrappers using library
├── parser.ts             # SIMPLIFIED: use metadata-transform
└── serializer.ts         # No changes
```

---

## Dependencies

### Package Dependencies

No new packages. Better utilization of existing `@cooklang/cooklang-ts`.

### Internal Dependencies

- `metadata-transform.ts` depends on: `constants.ts`
- `metadata.ts` depends on: `metadata-transform.ts`, `@cooklang/cooklang-ts`
- `parser.ts` depends on: `metadata-transform.ts`, `@cooklang/cooklang-ts`

---

## Risk Assessment

### Risk 1: Body Extraction Formatting

**Issue**: The library's `toCooklang()` output may differ from original formatting.

**Mitigation**: For `splitMetadataAndBody()`, may need to keep minimal regex to extract body while preserving original formatting. Library used for metadata only.

### Risk 2: Breaking Existing Behavior

**Issue**: Subtle differences between regex and library parsing.

**Mitigation**: Comprehensive unit tests before and after. Run both implementations in parallel during development to verify identical output.

### Risk 3: Performance

**Issue**: Parsing content twice (once for metadata, once for body).

**Mitigation**: Accept minor performance impact for cleaner code. The library is already fast, and recipes are small documents.

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `metadata-transform.ts` | transformRawMetadata produces correct output |
| `metadata.ts` | extractMetadataFromContent matches previous behavior |
| `parser.ts` | Full recipe parsing unchanged |

### Regression Tests

```typescript
// Test that refactored code produces identical output
const testCases = loadExistingRecipes();
for (const recipe of testCases) {
  const oldResult = oldExtractMetadata(recipe.content);
  const newResult = newExtractMetadata(recipe.content);
  expect(newResult).toEqual(oldResult);
}
```

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Parse → Edit → Save | Metadata round-trip preservation |
| Import external recipe | No data loss |

---

## Alternatives Considered

### Option A: Keep Dual Implementation

- **Pros**: No risk of breaking changes
- **Cons**: Continued duplication, maintenance burden
- **Why rejected**: Defeats purpose of refactoring

### Option B: Full Library Reliance (Selected with caveats)

- **Pros**: Minimal code, leverages tested library
- **Cons**: May need regex fallback for body extraction
- **Why selected**: Best balance of simplicity and functionality

### Option C: Custom Parser Replacement

- **Pros**: Full control
- **Cons**: Reinventing the wheel, bugs
- **Why rejected**: Library already does this well

---

## Open Design Questions

- [ ] Can we completely eliminate `splitMetadataAndBody()` or is it needed for editor?
- [ ] Should `metadata-transform.ts` be a separate file or merged into `metadata.ts`?
- [ ] Performance testing needed for double-parse scenario?
