# PR-051: Weekly Meal Planning, Data Foundation + Discovery Pipeline - Progress

> **Status**: Not Started
> **Started**: -
> **Target**: 2026-03-18
> **Branch**: `feat/051-meal-plan-data-discovery`

---

## Progress Overview

| Phase | Status | Notes |
|-------|--------|-------|
| Requirements | [x] Approved | 5 user stories, all criteria defined |
| Design | [x] Approved | 3 models, cleaning pipeline, CLI script |
| Phase 1: TypeScript interfaces | [ ] Not Started | Types and interfaces |
| Phase 2: Mongoose models | [ ] Not Started | 3 new models + index exports |
| Phase 3: Cleaning pipeline | [ ] Not Started | cleaner, scorer, tagger, client |
| Phase 4: Repository + utilities | [ ] Not Started | DB access, week utils, Cooklang import |
| Phase 5: CLI script | [ ] Not Started | Fetch all TheMealDB |
| Phase 6: Verification | [ ] Not Started | Lint, typecheck, manual test |

---

## Deliverables Checklist

- [ ] `src/db/models/weekly-menu.model.ts` - WeeklyMenu Mongoose model
- [ ] `src/db/models/discovery-recipe.model.ts` - DiscoveryRecipe Mongoose model
- [ ] `src/db/models/user-discovery-state.model.ts` - UserDiscoveryState Mongoose model
- [ ] `src/lib/discovery/types.ts` - TheMealDB API response types
- [ ] `src/lib/discovery/client.ts` - TheMealDB HTTP client
- [ ] `src/lib/discovery/cleaner.ts` - Ingredient normalization pipeline
- [ ] `src/lib/discovery/scorer.ts` - Quality scoring 0-100
- [ ] `src/lib/discovery/tagger.ts` - Auto-tag generation
- [ ] `src/lib/discovery/cooklang-import.ts` - Cooklang conversion
- [ ] `src/lib/discovery/repository.ts` - DiscoveryRecipe DB access
- [ ] `src/lib/menu/week-utils.ts` - ISO week label + date utilities
- [ ] `scripts/fetch-discovery-recipes.ts` - CLI fetch script
- [ ] `src/db/types/index.ts` - MODIFIED: new interfaces added
- [ ] `src/db/models/index.ts` - MODIFIED: new model exports

---

## Implementation Phases

### Phase 1: TypeScript Interfaces

**Dependencies**: None (can start immediately)

**Deliverables**:
- [ ] `src/lib/discovery/types.ts`
- [ ] `src/db/types/index.ts` (modifications)

**Agent Prompt**:
```
Context:
- Read: work/PR-051/design.md for all schema definitions
- Read: src/db/types/index.ts for existing interface patterns
- Read: src/lib/shopping/aggregator.ts for ParsedQuantity type (referenced later)

Task:
1. Create src/lib/discovery/types.ts with:
   - TheMealDB raw API response types (TheMealDBMeal, TheMealDBResponse)
   - CleanedIngredient interface: { name, quantity, unit, prep? }
   - CleanedMeal interface: full cleaned recipe before DB storage
   - QualityScore breakdown interface
   - Pipeline stage types

2. Add to src/db/types/index.ts:
   - IWeeklyMenu interface with all fields from design.md
   - IWeeklyMenuAssignment embedded doc interface
   - IWeeklyMenuVote embedded doc interface
   - IWeeklyMenuDocument extending IWeeklyMenu + Document
   - WeeklyMenuStatus type: 'building' | 'survey-sent' | 'locked-in'
   - MealSlot type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
   - DayOfWeek type: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
   - AssignmentSource type: 'cookbook' | 'discovery'
   - IDiscoveryRecipe interface with all fields from design.md
   - IDiscoveryRecipeDocument extending IDiscoveryRecipe + Document
   - DiscoverySource type: 'themealdb' | 'spoonacular'
   - DiscoveryAction type: 'seen' | 'saved' | 'dismissed'
   - IUserDiscoveryState interface
   - IUserDiscoveryStateDocument extending IUserDiscoveryState + Document

Follow existing patterns in the file. Use Types.ObjectId for refs.
Keep the section comment style (// --- Section Name --- //).

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 2: Mongoose Models

**Dependencies**: Phase 1

**Deliverables**:
- [ ] `src/db/models/weekly-menu.model.ts`
- [ ] `src/db/models/discovery-recipe.model.ts`
- [ ] `src/db/models/user-discovery-state.model.ts`
- [ ] `src/db/models/index.ts` (modifications)

**Agent Prompt**:
```
Context:
- Read: work/PR-051/design.md for full schema definitions and indexes
- Read: src/db/models/shopping-list.model.ts for embedded subdoc pattern
- Read: src/db/models/recipe.model.ts for general model pattern
- Read: src/db/models/index.ts for export pattern

Task:
1. Create src/db/models/weekly-menu.model.ts:
   - File header comment explaining embedded assignments/votes pattern
   - assignmentSchema subdoc with _id:true
   - voteSchema subdoc with _id:true
   - weeklyMenuSchema with all fields per design.md
   - 4 indexes: {ownerId,weekLabel} unique, {ownerId,status},
     {votingToken} unique sparse, {votingClosesAt} sparse
   - Export: WeeklyMenu model with IWeeklyMenuDocument type

2. Create src/db/models/discovery-recipe.model.ts:
   - File header comment
   - discoveryRecipeSchema with all fields per design.md
   - ingredients as embedded array of {name, quantity, unit}
   - 3 indexes: {qualityScore: -1}, {source,category}, text index on {title,tags}
   - Export: DiscoveryRecipe model

3. Create src/db/models/user-discovery-state.model.ts:
   - File header comment
   - timestamps: { createdAt: true, updatedAt: false }
   - 2 indexes: {userId,externalId} unique, {userId,action}
   - Export: UserDiscoveryState model

4. Update src/db/models/index.ts:
   - Add type re-exports for all new interfaces and types
   - Add model exports for WeeklyMenu, DiscoveryRecipe, UserDiscoveryState
   - Keep alphabetical ordering

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 3: Cleaning Pipeline

**Dependencies**: Phase 1 (needs types)

**Deliverables**:
- [ ] `src/lib/discovery/cleaner.ts`
- [ ] `src/lib/discovery/scorer.ts`
- [ ] `src/lib/discovery/tagger.ts`
- [ ] `src/lib/discovery/client.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-051/design.md for pipeline specifications
- Read: src/lib/discovery/types.ts (created in Phase 1)
- Read: src/lib/logger.ts for logging patterns
- Read: src/lib/shopping/aggregator.ts for parseQuantity reference

Task:
1. Create src/lib/discovery/cleaner.ts:
   - File header comment
   - cleanIngredient(name: string, measure: string): CleanedIngredient
   - separatePrep(): regex-based prep extraction
   - parseMeasure(): cascading regex pipeline (7 tiers per design.md)
   - SPELLING_FIXES map with known TheMealDB typos
   - applySpellingFix(): lookup and correct
   - cleanMeal(raw: TheMealDBMeal): CleanedMeal
     - Extract ingredients from strIngredient1..20 and strMeasure1..20
     - Skip empty/null pairs
     - Clean each ingredient
   - Export all public functions

2. Create src/lib/discovery/scorer.ts:
   - File header comment
   - Named constants for weights: INGREDIENT_WEIGHT = 40, etc.
   - Named constants for thresholds: MIN_QUALITY_SCORE = 60
   - scoreRecipe(meal: CleanedMeal): number
   - Implement weighted scoring per design.md table
   - Return integer 0-100

3. Create src/lib/discovery/tagger.ts:
   - File header comment
   - generateTags(meal: CleanedMeal): string[]
   - Handle both cases: existing strTags and null strTags
   - Notable ingredient detection for auto-tagging
   - Deduplicate, lowercase, sort

4. Create src/lib/discovery/client.ts:
   - File header comment
   - THEMEALDB_BASE_URL constant
   - LETTERS array: 'a' through 'z'
   - FETCH_DELAY_MS = 100 (courtesy delay)
   - fetchByLetter(letter: string): Promise<TheMealDBMeal[]>
   - fetchAll(onProgress?: callback): AsyncGenerator yielding batches
   - Handle network errors per letter gracefully (warn + continue)
   - Use native fetch, no external HTTP library

Use logger from src/lib/logger.ts for all logging.
No console.log anywhere.

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 4: Repository + Utilities

**Dependencies**: Phase 2 (needs models) + Phase 3 (needs cleaner types)

**Deliverables**:
- [ ] `src/lib/discovery/repository.ts`
- [ ] `src/lib/discovery/cooklang-import.ts`
- [ ] `src/lib/menu/week-utils.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-051/design.md for repository and utility specs
- Read: src/db/models/discovery-recipe.model.ts (created in Phase 2)
- Read: src/lib/cooklang/ directory for existing serializer
- Read: src/lib/telemetry.ts for withTrace pattern

Task:
1. Create src/lib/discovery/repository.ts:
   - File header comment
   - upsertDiscoveryRecipe(cleaned: CleanedMeal, score: number): Promise
     - Upsert by externalId, set cleanedAt to now
   - findByQuality(minScore: number, page: number, limit: number): Promise
     - Paginated query, sorted by qualityScore desc
   - searchDiscoveryRecipes(query: string, page: number, limit: number): Promise
     - Text search on title + tags
   - countBySource(source: DiscoverySource): Promise<number>
   - Wrap DB calls with withTrace spans

2. Create src/lib/discovery/cooklang-import.ts:
   - File header comment
   - toCooklang(recipe: IDiscoveryRecipe): string | null
   - Build Cooklang-formatted string from cleaned ingredients + instructions
   - Use existing serializer patterns from src/lib/cooklang/
   - Return null if the recipe structure is too incomplete for valid Cooklang

3. Create src/lib/menu/week-utils.ts:
   - File header comment
   - getISOWeekLabel(date: Date): string
     - Returns "YYYY-Www" format (e.g., "2026-W11")
   - getWeekStartDate(date: Date): Date
     - Returns Monday 00:00:00 UTC of the given date's ISO week
   - getCurrentWeekLabel(): string
   - getNextWeekLabel(): string
   - parseWeekLabel(label: string): { year: number, week: number }
   - No external date library; use native Date + arithmetic

Verification:
- npm run typecheck passes
- npm run lint passes
```

---

### Phase 5: CLI Script

**Dependencies**: Phase 3 + Phase 4 (needs full pipeline + repository)

**Deliverables**:
- [ ] `scripts/fetch-discovery-recipes.ts`

**Agent Prompt**:
```
Context:
- Read: work/PR-051/design.md for CLI script spec
- Read: src/db/connection.ts for connectDB pattern
- Read: src/lib/discovery/client.ts (created in Phase 3)
- Read: src/lib/discovery/cleaner.ts (created in Phase 3)
- Read: src/lib/discovery/scorer.ts (created in Phase 3)
- Read: src/lib/discovery/tagger.ts (created in Phase 3)
- Read: src/lib/discovery/repository.ts (created in Phase 4)

Task:
1. Create scripts/fetch-discovery-recipes.ts:
   - File header comment explaining purpose and usage
   - Import connectDB, client, cleaner, scorer, tagger, repository
   - main() async function:
     a. Connect to MongoDB
     b. Iterate through fetchAll() generator
     c. For each raw meal: clean → tag → score → upsert
     d. Track counts: added, updated, skipped, errors
     e. Log progress per letter
     f. Print final summary: total fetched, cleaned, stored, average score
   - Handle process signals (SIGINT) for graceful shutdown
   - Exit with code 0 on success, 1 on fatal error

   Usage: npx tsx scripts/fetch-discovery-recipes.ts

Verification:
- npm run typecheck passes
- npm run lint passes
- Script runs and connects to DB (may need MONGODB_URI env var)
```

---

### Phase 6: Verification

**Dependencies**: All previous phases

**Agent Prompt**:
```
Context:
- All files from Phases 1-5 are created

Task:
1. Run npm run lint:fix to auto-fix formatting
2. Run npm run lint and fix any remaining issues
3. Run npm run typecheck and fix any type errors
4. Verify all deliverables exist (check list above)
5. Review index exports in src/db/models/index.ts are correct
6. Review type exports in src/db/types/index.ts are complete
7. Run scripts/fetch-discovery-recipes.ts in dry-run mode if possible

Verification:
- npm run lint: zero errors
- npm run typecheck: zero errors
- All 14 deliverables checked off
```

---

## Parallel Work Streams

```
Timeline:
Phase 1 (types) ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2 (models) ░░░░░░██████░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 3 (pipeline) ░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░
Phase 4 (repo+utils) ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░
Phase 5 (CLI) ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░
Phase 6 (verify) ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░

Parallel opportunities:
Stream A: Phase 1 → Phase 2 ████████████████
Stream B: Phase 1 → Phase 3 ████████████████████
Merge: Phase 4 (needs both) → Phase 5 → Phase 6
```

### Stream A: Models

Phase 1 types → Phase 2 models. Can run in parallel with Stream B after Phase 1 completes.

### Stream B: Pipeline

Phase 1 types → Phase 3 cleaning pipeline. Can run in parallel with Stream A after Phase 1 completes.

After both streams complete, Phase 4 merges them (repository needs models + pipeline types), then Phase 5 ties it together with the CLI script.

---

## Completion Confidence

### Automated Checks
- [ ] Deliverables registered in `scripts/deliverables.yaml`
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `python scripts/progress.py` shows PR-051 complete

### Quality Checks
- [ ] No TODO comments left in code
- [ ] No console.log statements (use logger)
- [ ] File header comments on all new files
- [ ] Documentation updated if needed

### Integration Checks
- [ ] CLI script connects to MongoDB and fetches recipes
- [ ] All 4 indexes on WeeklyMenu created correctly
- [ ] Text index on DiscoveryRecipe works for search
- [ ] Unique index on UserDiscoveryState prevents duplicates

---

## Session Log

### Session 1 - 2026-03-11

**Agent**: Claude Code (Sisyphus)

**Completed**:
- [x] Requirements document created
- [x] Design document created
- [x] Progress document created

**Next Steps**:
- [ ] Phase 1: TypeScript interfaces
- [ ] Phase 2: Mongoose models
- [ ] Phase 3: Cleaning pipeline
