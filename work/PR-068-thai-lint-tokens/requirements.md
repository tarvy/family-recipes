# PR-068: Thai-lint Magic Numbers in Design Tokens - Requirements

> **Status**: Ready for review
> **Branch**: `fix/thai-lint-tokens`

## Problem

CI's Thai-lint job fails on `main` (since de271d3): `thailint magic-numbers src/`
reports `150` and `500` in `motionDurationMs` in
`src/lib/design-system/tokens.ts`. Only `0, 1, -1, 100, 300` are allowed
unnamed (`.thailint.yaml`).

## Requirements

- Replace the literals with named `UPPER_SNAKE_CASE` constants (repo
  convention, e.g. `SEARCH_DEBOUNCE_MS`); values and the exported
  `motionDurationMs` shape stay unchanged.
- All four CI Thai-lint commands (`dry`, `nesting`, `magic-numbers`, `perf`)
  pass on `src/`.
- No behavior change.
