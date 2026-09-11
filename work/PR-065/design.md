# PR-065: Lo Mein Framework Recipe - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-09-11
> **Author**: Cursor

## Overview

Add one standalone Cooklang source file under `recipes/entrees/`. The file will
use concrete starter quantities for four servings while naming the protein and
vegetables as interchangeable framework components. No application code,
database schema, or API changes are required because recipes are the source of
truth and are parsed during the existing sync flow.

## Architecture

### System Context

```text
YouTube framework
       │
       ▼
recipes/entrees/lo-mein-framework.cook
       │
       ▼
Existing Cooklang parser and recipe sync
       │
       ▼
Recipe metadata, ingredients, and steps in the cookbook
```

### Recipe Components

```text
Noodle base
├── Protein of choice
├── Vegetables of choice
├── Aromatics: garlic, ginger, optional chili
├── Sauce: salty + sour + sweet at 2:1:0.5
└── Garnish: scallions and optional sesame/chili
```

### Data Flow

1. Cook the noodles according to their package directions and loosen them.
2. Mix the sauce before the wok gets hot.
3. Stir-fry the protein and vegetables separately in batches to preserve heat.
4. Bloom aromatics, return the cooked components, add noodles and sauce, and
   toss until glossy.
5. Finish with garnish and adjustment options.

## Database Changes

None. The existing recipe sync process will derive metadata and ingredients
from the new `.cook` file.

## API Design

None.

## UI Components

None.

## File Structure

```text
recipes/
└── entrees/
    └── lo-mein-framework.cook
```

## Dependencies

### New Packages

None.

### Internal Dependencies

- Existing Cooklang syntax and parser documented in `docs/COOKLANG.md`.
- Existing recipe sync described in `docs/COOKLANG.md`.

## Security Considerations

- [x] No user input or API boundary is added.
- [x] No credentials or sensitive data are included.
- [x] Source URL is public recipe attribution only.

## Observability

No runtime code is added. The existing recipe sync logging will report parsing
or synchronization failures for the new file.

## Testing Strategy

### Unit Tests

No new unit test is needed for a static recipe. Validate the file with the
existing Cooklang parser or sync check.

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Recipe sync | New file parses and is indexed as an entree |

### Manual Verification

- Confirm the title, source, and six framework components are visible in the
  file.
- Confirm the sauce quantities preserve the 2:1:0.5 ratio.
- Confirm substitution guidance is clear.

## Rollout Plan

1. [x] Add the tracked work documents.
2. [ ] Add the Cooklang recipe.
3. [ ] Run recipe parsing/validation plus repository quality checks.
4. [ ] Commit, push, and open the draft PR.

## Alternatives Considered

### Fixed Chicken Lo Mein

- **Pros**: Simpler shopping list and more immediately prescriptive.
- **Cons**: Loses the central reusable-framework goal of the source material.
- **Why rejected**: The user requested the framework, not one variation.

### Framework as Application Code

- **Pros**: Could support interactive ingredient selection.
- **Cons**: Unnecessary scope and would bypass the cookbook's Cooklang source
  of truth.
- **Why rejected**: A normal recipe file is sufficient for this request.

## Open Design Questions

None.
