# PR-051: Weekly Meal Planning, Data Foundation + Discovery Pipeline - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-03-11
> **Author**: Claude Code (Sisyphus)

---

## Overview

Three new Mongoose models (WeeklyMenu, DiscoveryRecipe, UserDiscoveryState) and a TheMealDB data cleaning pipeline. This is the pure data layer for weekly meal planning: no API routes, no UI. PR-052 builds the API on top of these models, PR-053 adds the frontend, PR-054 handles the shopping list finalization UI.

---

## Architecture

### System Context

```
TheMealDB API (external)
      |
      v
CLI fetch script (scripts/fetch-discovery-recipes.ts)
      |
      v  fetch → clean → score → tag → upsert
MongoDB Atlas
├── WeeklyMenu         (menu state, assignments, votes)
├── DiscoveryRecipe    (cleaned external recipes)
└── UserDiscoveryState (per-user seen/saved/dismissed)
```

### Component Design

```
src/lib/discovery/
├── types.ts           # TheMealDB API response types, pipeline types
├── client.ts          # HTTP client: paginated A-Z fetch
├── cleaner.ts         # Ingredient normalization, measure parsing, spelling
├── scorer.ts          # Quality scoring 0-100
├── tagger.ts          # Auto-tag generation
├── cooklang-import.ts # Best-effort Cooklang generation
└── repository.ts      # DiscoveryRecipe DB access layer

src/lib/menu/
└── week-utils.ts      # ISO week labels, weekStartDate calculation

src/db/models/
├── weekly-menu.model.ts
├── discovery-recipe.model.ts
└── user-discovery-state.model.ts
```

### Data Flow: Cleaning Pipeline

```
TheMealDB JSON
  → client.ts fetches raw meals (letter-by-letter A-Z)
  → cleaner.ts normalizes ingredients:
      1. Separate prep from name ("chopped tomatoes" → "tomatoes")
      2. Parse measures (fractions, decimals, jammed units, bare numbers)
      3. Apply spelling corrections (Challots → Shallots)
  → tagger.ts generates tags when strTags is null
  → scorer.ts assigns quality score 0-100
  → repository.ts upserts into DiscoveryRecipe collection
```

### State Machine: WeeklyMenu Status

```
  building ←──────────────────┐
     │                        │
     v (sendSurvey)           │ (cancelSurvey / unlockMenu)
  survey-sent ────────────────┘
     │                        │
     v (finalizeMenu)         │
  locked-in ──────────────────┘
     (unlockMenu → building)
```

Transitions:
- `building` → `survey-sent`: generates votingToken, sets votingOpenedAt + votingClosesAt (24h window)
- `survey-sent` → `building`: clears votingToken and vote data (cancel)
- `survey-sent` → `locked-in`: records finalizedAt, creates shopping list
- `locked-in` → `building`: clears votes, deletes linked shopping list

---

## Database Changes

### New Model: WeeklyMenu

```typescript
// src/db/models/weekly-menu.model.ts

const assignmentSchema = new Schema(
  {
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe' },
    discoveryRecipeId: { type: Schema.Types.ObjectId, ref: 'DiscoveryRecipe' },
    title: { type: String, required: true },
    thumbnailUrl: { type: String },
    source: { type: String, required: true, enum: ['cookbook', 'discovery'] },
    day: { type: String, required: true, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    mealSlot: { type: String, default: 'dinner', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const voteSchema = new Schema(
  {
    voterName: { type: String, required: true },
    voterToken: { type: String, required: true },
    picks: [{ type: Schema.Types.ObjectId }],
    votedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const weeklyMenuSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekLabel: { type: String, required: true },       // "2026-W11"
    weekStartDate: { type: Date, required: true },     // Monday
    status: {
      type: String,
      required: true,
      enum: ['building', 'survey-sent', 'locked-in'],
      default: 'building',
    },
    assignments: [assignmentSchema],
    votes: [voteSchema],
    votingToken: { type: String, unique: true, sparse: true },
    votingOpenedAt: { type: Date },
    votingClosesAt: { type: Date },
    finalizedAt: { type: Date },
    shoppingListId: { type: Schema.Types.ObjectId, ref: 'ShoppingList' },
  },
  { timestamps: true },
);

// Indexes
weeklyMenuSchema.index({ ownerId: 1, weekLabel: 1 }, { unique: true });
weeklyMenuSchema.index({ ownerId: 1, status: 1 });
weeklyMenuSchema.index({ votingToken: 1 }, { unique: true, sparse: true });
weeklyMenuSchema.index({ votingClosesAt: 1 }, { sparse: true });
```

### New Model: DiscoveryRecipe

```typescript
// src/db/models/discovery-recipe.model.ts

const discoveryRecipeSchema = new Schema(
  {
    externalId: { type: String, required: true, unique: true },
    source: { type: String, required: true, enum: ['themealdb', 'spoonacular'] },
    title: { type: String, required: true },
    imageUrl: { type: String },
    category: { type: String },
    cuisine: { type: String },
    tags: [{ type: String }],
    ingredients: [
      {
        name: { type: String, required: true },
        quantity: { type: String },
        unit: { type: String },
      },
    ],
    instructions: { type: String },
    sourceUrl: { type: String },
    rawData: { type: Schema.Types.Mixed },
    qualityScore: { type: Number, min: 0, max: 100, default: 0 },
    cleanedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
discoveryRecipeSchema.index({ qualityScore: -1 });
discoveryRecipeSchema.index({ source: 1, category: 1 });
discoveryRecipeSchema.index({ title: 'text', tags: 'text' });
```

### New Model: UserDiscoveryState

```typescript
// src/db/models/user-discovery-state.model.ts

const userDiscoveryStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    externalId: { type: String, required: true },
    action: { type: String, required: true, enum: ['seen', 'saved', 'dismissed'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Indexes
userDiscoveryStateSchema.index({ userId: 1, externalId: 1 }, { unique: true });
userDiscoveryStateSchema.index({ userId: 1, action: 1 });
```

### Schema Modifications

| File | Change | Migration Required |
|------|--------|-------------------|
| `src/db/types/index.ts` | Add IWeeklyMenu, IDiscoveryRecipe, IUserDiscoveryState interfaces | No |
| `src/db/models/index.ts` | Export new models + types | No |

---

## Cleaning Pipeline Design

### Ingredient Cleaner (`src/lib/discovery/cleaner.ts`)

**Prep separation**: Regex-based extraction of cooking verbs from ingredient names.
- Pattern: `/(chopped|diced|minced|sliced|crushed|grated|peeled|melted|softened|dried|fresh|frozen)\s+/i`
- Input: `"finely chopped onions"` → Output: `{ name: "onions", prep: "finely chopped" }`

**Measure parsing**: Cascading regex pipeline, first match wins.
1. Unicode fractions: `\u00BC` (1/4), `\u00BD` (1/2), `\u00BE` (3/4)
2. Text fractions: `1/2`, `1 1/2` (mixed numbers)
3. Decimals: `2.5`
4. Jammed units: `1lb`, `200g`, `100ml` (number directly against unit)
5. Bare numbers: `3` (with no unit)
6. Named quantities: `pinch`, `handful`, `splash`
7. Fallback: empty quantity, full string as name

**Spelling corrections**: Static map of known TheMealDB typos.
```typescript
const SPELLING_FIXES: Record<string, string> = {
  'Challots': 'Shallots',
  'Venezulan': 'Venezuelan',
  'Parsely': 'Parsley',
  'Brocoli': 'Broccoli',
  // ... more as discovered
};
```

### Quality Scorer (`src/lib/discovery/scorer.ts`)

Weighted scoring, 0-100:

| Factor | Weight | Scoring Logic |
|--------|--------|---------------|
| Ingredients | 40% | 0 if empty, 20 if 1-3, 30 if 4-6, 40 if 7+ |
| Instructions | 25% | 0 if empty, 10 if <50 chars, 20 if <200 chars, 25 if 200+ |
| Image | 15% | 0 if null/empty, 15 if valid URL |
| Category | 10% | 0 if null/empty, 10 if present |
| Cuisine | 10% | 0 if null/empty, 10 if present |

Recipes scoring below 60 are stored but excluded from discovery browsing.

### Auto-Tagger (`src/lib/discovery/tagger.ts`)

When `strTags` is null or empty:
1. Add category as tag (lowercase): `"Chicken"` → `"chicken"`
2. Add cuisine/area as tag (lowercase): `"Thai"` → `"thai"`
3. Scan ingredients for notable items (protein, grains, key vegetables)
4. Deduplicate and lowercase all tags

When `strTags` is present:
- Split on commas, trim whitespace, lowercase each

### Cooklang Import (`src/lib/discovery/cooklang-import.ts`)

Best-effort conversion of a DiscoveryRecipe into Cooklang format, using the existing serializer in `src/lib/cooklang/`. This enables "save to cookbook" in future PRs. Not all recipes will convert cleanly; the function returns `string | null`.

---

## API Design

No API endpoints in this PR. The models and pipeline are consumed by:
- `scripts/fetch-discovery-recipes.ts` (CLI, this PR)
- PR-052 API routes (next PR)

---

## File Structure

```
src/
├── db/
│   ├── types/
│   │   └── index.ts                     # MODIFIED: add 3 new interfaces
│   └── models/
│       ├── index.ts                     # MODIFIED: export new models
│       ├── weekly-menu.model.ts         # NEW
│       ├── discovery-recipe.model.ts    # NEW
│       └── user-discovery-state.model.ts # NEW
├── lib/
│   ├── discovery/
│   │   ├── types.ts                     # NEW: TheMealDB API types
│   │   ├── client.ts                    # NEW: HTTP client
│   │   ├── cleaner.ts                   # NEW: ingredient normalization
│   │   ├── scorer.ts                    # NEW: quality scoring
│   │   ├── tagger.ts                    # NEW: auto-tag generation
│   │   ├── cooklang-import.ts           # NEW: Cooklang conversion
│   │   └── repository.ts               # NEW: DB access layer
│   └── menu/
│       └── week-utils.ts               # NEW: ISO week utilities
scripts/
└── fetch-discovery-recipes.ts           # NEW: CLI fetch script
```

---

## Dependencies

### New Packages

None. The TheMealDB client uses native `fetch` (available in Node 18+). All other functionality uses existing dependencies (Mongoose, date-fns if needed for week calculations).

### Internal Dependencies

- `src/db/connection.ts`: database connection for CLI script and repository
- `src/lib/cooklang/`: existing serializer for Cooklang import
- `src/lib/shopping/aggregator.ts`: `parseQuantity()` referenced by PR-052's ingredient validator
- `src/lib/logger.ts`: logging throughout pipeline

---

## Security Considerations

- [x] No user input in this PR (CLI script only, no API routes)
- [x] TheMealDB data treated as untrusted: sanitized through Mongoose schema validation
- [x] `rawData` field stored as Mixed type for debugging but never rendered to users
- [x] No secrets in code: TheMealDB free API requires no key
- [x] CLI script runs in trusted server environment only

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| CLI fetch started | info | `{ source: 'themealdb' }` |
| Letter batch fetched | info | `{ letter, count }` |
| Letter fetch failed | warn | `{ letter, error }` |
| Recipe cleaned | debug | `{ externalId, qualityScore }` |
| Upsert completed | info | `{ added, updated, total }` |
| Low quality recipe skipped | debug | `{ externalId, score }` |

### Traces

| Span | Attributes |
|------|------------|
| `discovery.fetch` | `{ letter, count }` |
| `discovery.clean` | `{ externalId }` |
| `discovery.upsert` | `{ source, batchSize }` |

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `cleaner.ts` | Prep separation, measure parsing (all 7 tiers), spelling corrections |
| `scorer.ts` | Score boundaries (0, 59, 60, 100), each weighted factor |
| `tagger.ts` | Auto-generation from category/cuisine/ingredients, dedup, existing tags |
| `week-utils.ts` | ISO week label format, Monday start date, year boundary weeks |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Full pipeline | Raw TheMealDB JSON → cleaned DiscoveryRecipe document |
| CLI script | Fetch + clean + upsert round trip (with mocked HTTP) |
| Model validation | Required fields, enum constraints, index uniqueness |

### Manual Verification

| Check | Expected |
|-------|----------|
| `npm run typecheck` | Zero errors |
| `npm run lint` | Zero errors |
| CLI script full run | 250+ recipes stored, summary printed |
| Quality score distribution | Scores spread across 0-100 range |

---

## Alternatives Considered

### Option A: Fetch on demand from TheMealDB

- **Pros**: No storage cost, always fresh data
- **Cons**: Slow (external API call per browse), TheMealDB uptime dependency, can't score or clean
- **Why rejected**: Poor user experience. External API latency makes browsing sluggish.

### Option B: Pre-fetch and store (Selected)

- **Pros**: Fast browsing, quality scoring, ingredient cleaning, works offline from TheMealDB
- **Cons**: Storage cost (~300 documents), data can go stale
- **Why selected**: Cleaning and scoring are the whole point. Users need curated, well-structured recipes, not raw API dumps. A periodic refresh keeps data fresh enough.

---

## Open Design Questions

- [x] Store raw TheMealDB response? **Yes, in rawData field for debugging. Never exposed to users.**
- [x] Cooklang import fidelity? **Best-effort. Returns null if conversion is too lossy. Full import can be improved later.**
