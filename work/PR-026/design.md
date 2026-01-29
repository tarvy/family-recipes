# PR-026: Cooklang Metadata Compatibility - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-01-29
> **Author**: Claude Code

---

## Overview

Extend the Cooklang metadata parser to support standard key aliases (serves/yield, time/duration, introduction) and additional metadata fields (author, diet, locale). Also add support for compact time notation (1h30m) alongside existing verbose formats.

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     Recipe Import Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  .cook file ──► parser.ts ──► IRecipe ──► Database/UI       │
│       │              │                                       │
│       │              ▼                                       │
│       │     ┌────────────────┐                              │
│       │     │ METADATA_KEYS  │ ◄── Extended with aliases    │
│       │     │ + ALIASES      │                              │
│       │     └────────────────┘                              │
│       │              │                                       │
│       ▼              ▼                                       │
│  >> serves: 4   parseMetadata() ──► { servings: 4 }        │
│  >> time: 1h30m parseTime()     ──► { totalTime: 90 }      │
│  >> author: X   (new field)     ──► { author: "X" }        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

```
src/lib/cooklang/
├── constants.ts      # METADATA_KEYS + new METADATA_ALIASES map
├── parser.ts         # Uses aliases when parsing metadata
├── metadata.ts       # extractMetadataFromContent() updated
└── types.ts          # Extended CooklangMetadata interface (if needed)

src/db/types/
└── index.ts          # IRecipe interface - add optional new fields
```

### Data Flow

```
1. Raw Cooklang content with metadata lines
   ">> serves: 4"
   ">> prep time: 1h30m"
   ">> author: Grandma"
        │
        ▼
2. extractMetadataFromContent() / parser.ts
   - Normalize key to lowercase
   - Check METADATA_ALIASES map: "serves" → "servings"
   - Parse value (time parsing for time fields)
        │
        ▼
3. Structured metadata object
   { servings: 4, prepTime: 90, author: "Grandma" }
        │
        ▼
4. IRecipe object with populated fields
```

---

## Database Changes

### Schema Modifications

| Table | Change | Migration Required |
|-------|--------|-------------------|
| Recipe | Add optional `author?: string` | No (Mongoose flexible) |
| Recipe | Add optional `diet?: string[]` | No |
| Recipe | Add optional `locale?: string` | No |

**Note**: MongoDB/Mongoose allows adding optional fields without migration. These fields will simply be undefined for existing recipes.

### Type Updates

```typescript
// src/db/types/index.ts
interface IRecipe {
  // ... existing fields ...

  // New optional metadata fields
  author?: string;
  diet?: string[];
  locale?: string;
}
```

---

## API Design

No API changes required. The existing POST/PUT endpoints accept raw Cooklang content, and the parser will automatically handle the new metadata formats.

---

## UI Components

No UI changes in this PR. The editor preserves unrecognized metadata on round-trip, and the new fields will be parsed correctly. Future PRs may add UI exposure for author/diet/locale.

---

## File Structure

```
src/
├── lib/
│   └── cooklang/
│       ├── constants.ts    # Modified: Add METADATA_ALIASES
│       ├── parser.ts       # Modified: Use aliases, new time parsing
│       └── metadata.ts     # Modified: extractMetadataFromContent aliases
└── db/
    └── types/
        └── index.ts        # Modified: Add author, diet, locale to IRecipe
```

---

## Dependencies

### New Packages

None required.

### Internal Dependencies

- Depends on: `src/lib/cooklang/constants.ts`
- Used by: `src/lib/cooklang/parser.ts`, `src/lib/cooklang/metadata.ts`

---

## Implementation Details

### 1. Metadata Key Aliases

```typescript
// src/lib/cooklang/constants.ts

export const METADATA_ALIASES: Record<string, string> = {
  // Servings aliases
  'serves': METADATA_KEYS.SERVINGS,
  'yield': METADATA_KEYS.SERVINGS,

  // Time aliases
  'time': METADATA_KEYS.TOTAL_TIME,
  'duration': METADATA_KEYS.TOTAL_TIME,
  'time required': METADATA_KEYS.TOTAL_TIME,

  // Description aliases
  'introduction': METADATA_KEYS.DESCRIPTION,

  // New canonical keys (map to themselves for consistency)
  'author': 'author',
  'diet': 'diet',
  'locale': 'locale',
};

// Helper function
export function normalizeMetadataKey(key: string): string {
  const normalized = key.toLowerCase().trim();
  return METADATA_ALIASES[normalized] ?? normalized;
}
```

### 2. Compact Time Parsing

```typescript
// src/lib/cooklang/constants.ts or parser.ts

/**
 * Parse time strings including compact notation
 * Supports: "30 minutes", "1 hour", "1h30m", "45m", "2h"
 */
export function parseTimeString(timeStr: string): number | undefined {
  const trimmed = timeStr.trim().toLowerCase();

  // Try compact format first: 1h30m, 45m, 2h
  const compactMatch = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
  if (compactMatch && (compactMatch[1] || compactMatch[2])) {
    const hours = parseInt(compactMatch[1] || '0', 10);
    const minutes = parseInt(compactMatch[2] || '0', 10);
    return hours * 60 + minutes;
  }

  // Fall back to verbose format: "30 minutes", "1 hour"
  const verboseMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(\w+)?$/);
  if (verboseMatch?.[1]) {
    const value = parseFloat(verboseMatch[1]);
    const unit = (verboseMatch[2] ?? 'minutes').toLowerCase();
    const multiplier = TIME_UNIT_TO_MINUTES[unit] ?? 1;
    return Math.round(value * multiplier);
  }

  return undefined;
}
```

### 3. Yield/Serves Number Extraction

```typescript
/**
 * Parse servings from various formats
 * "4" → 4
 * "4 servings" → 4
 * "12 cookies" → 12
 * "2-4" → 2 (take minimum)
 */
export function parseServings(value: string): number | undefined {
  // Extract first number from string
  const match = value.match(/^(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : undefined;
}
```

---

## Security Considerations

- [x] Input validation implemented (parsing handles invalid input gracefully)
- [x] No authentication changes
- [x] No authorization changes
- [x] No sensitive data handling
- [x] No injection risks (parsing only, no database queries with raw input)

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Unknown metadata key | debug | `{ key, value, file }` |
| Time parse failure | debug | `{ value, file }` |

### Traces

| Span | Attributes |
|------|------------|
| `cooklang.parse` | `metadata_keys_found`, `aliases_used` |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `constants.ts` | `normalizeMetadataKey()` returns correct mappings |
| `parser.ts` | `parseTimeString()` handles all formats |
| `parser.ts` | `parseServings()` extracts numbers correctly |
| `metadata.ts` | `extractMetadataFromContent()` uses aliases |

### Test Cases

```typescript
// Time parsing
expect(parseTimeString('30 minutes')).toBe(30);
expect(parseTimeString('1 hour')).toBe(60);
expect(parseTimeString('1h30m')).toBe(90);
expect(parseTimeString('45m')).toBe(45);
expect(parseTimeString('2h')).toBe(120);

// Servings parsing
expect(parseServings('4')).toBe(4);
expect(parseServings('4 servings')).toBe(4);
expect(parseServings('12 cookies')).toBe(12);

// Metadata aliases
expect(normalizeMetadataKey('serves')).toBe('servings');
expect(normalizeMetadataKey('yield')).toBe('servings');
expect(normalizeMetadataKey('time')).toBe('total time');
```

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Parse recipe with aliases | Full recipe with `serves`, `time`, `introduction` parses correctly |
| Round-trip preservation | Recipe with new fields survives edit → save cycle |

---

## Rollout Plan

1. [x] No feature flag needed (backwards compatible)
2. [ ] Implement and test locally
3. [ ] Deploy to preview
4. [ ] Verify with sample recipes from cooklang.org
5. [ ] Merge to main
6. [ ] Update docs/COOKLANG.md with supported metadata keys

---

## Alternatives Considered

### Option A: Strict Spec Compliance Only

- **Pros**: Minimal changes, only add spec-defined aliases
- **Cons**: Doesn't add useful fields like author, diet
- **Why rejected**: Missing opportunity to improve recipe organization

### Option B: Full Nested Metadata Support (Selected Partial)

- **Pros**: Full spec compliance with `source.name`, `time.prep` format
- **Cons**: Significant complexity, breaking change potential
- **Why deferred**: Aliases provide 80% of value with 20% of effort

### Option C: Extended Metadata with Aliases (Selected)

- **Pros**: Backwards compatible, covers common use cases, adds useful fields
- **Cons**: Doesn't support nested format
- **Why selected**: Best balance of value and implementation effort

---

## Open Design Questions

- [x] Use single `parseTimeString()` or keep separate functions? → **Single function with format detection**
- [ ] Add validation for locale format (e.g., must be `xx_XX`)? → Defer, accept any string for now
