# Linting Configuration

This project uses a two-tier linting strategy optimized for AI-maintained code:

1. **Biome** - Fast, instant feedback on style, formatting, and syntax
2. **Thai-lint** - AI-focused code quality checks in CI

## Biome

[Biome](https://biomejs.dev/) is the primary linter and formatter, replacing both ESLint and Prettier with 10-25x better performance.

### Configuration

The configuration is in `biome.json`. Key rules:

| Rule | Level | Purpose |
|------|-------|---------|
| `noExcessiveCognitiveComplexity` | error | Max 15 complexity |
| `noConsoleLog` | warn | Catch debug statements |
| `noDoubleEquals` | error | Enforce strict equality |
| `noAccumulatingSpread` | error | Prevent O(n²) spread |
| `noUnusedImports` | error | Clean imports |
| `noUnusedVariables` | error | Clean code |
| `useBlockStatements` | error | Explicit blocks |
| `useConst` | error | Immutability preference |

### Usage

```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format only
npm run format

# Type check
npm run typecheck
```

### Just (optional)

If you use `just`, run:

```bash
just lint
just lint-fix
just thai-lint
```

### Pre-commit Hook

Biome runs on the entire repo before every commit, then re-checks staged files via Husky + lint-staged:

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json,jsonc}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

### Editor Integration

Install the Biome VS Code extension for real-time feedback:

1. Install `biomejs.biome` extension
2. Editor settings are in `.vscode/settings.json`
3. Format on save is enabled by default

---

## Thai-lint

[Thai-lint](https://github.com/be-wise-be-kind/thai-lint) is a Python-based linter that catches anti-patterns commonly introduced by AI coding assistants.

### Installation

```bash
pip install thai-lint
# Or using Docker
docker run --rm -v $(pwd):/data washad/thailint:latest --help
```

### Configuration

The configuration is in `.thailint.yaml`:

```yaml
min_duplicate_lines: 5      # DRY: Minimum lines to flag as duplicate
max_nesting_depth: 4        # Maximum nesting levels
allowed_numbers: [0, 1, -1, 100]  # Magic numbers that are OK
max_public_methods: 10      # SRP: Max methods per class
max_file_lines: 500         # Maximum file size
```

### Available Linters

| Linter | Purpose |
|--------|---------|
| `dry` | Duplicate code detection |
| `nesting` | Excessive nesting depth |
| `magic-numbers` | Unnamed numeric literals |
| `perf` | O(n²) patterns (loops with string concat, etc.) |
| `srp` | Single Responsibility Principle violations |
| `file-header` | Documentation headers |
| `stateless-class` | Classes that should be functions |
| `collection-pipeline` | Loops with embedded filtering |
| `stringly-typed` | Strings that should be enums |
| `print-statements` | Debug prints left in code |
| `lazy-ignores` | Unjustified lint suppressions |

### Usage

```bash
# Run specific linter
thailint dry src/
thailint nesting src/
thailint magic-numbers src/
thailint perf src/

# Run all linters
thailint all src/

# Output JSON for automation
thailint all src/ --format json
```

### CI Integration

Thai-lint runs in GitHub Actions CI and fails the build on violations. See `.github/workflows/ci.yml`:

```yaml
- name: Run Thai-lint
  run: |
    pip install thai-lint
    thailint dry src/
    thailint nesting src/
    thailint magic-numbers src/
    thailint performance src/
```

---

## Why Two Linters?

| Concern | Biome | Thai-lint |
|---------|-------|-----------|
| **Speed** | ~50ms | ~2-5s |
| **Pre-commit** | Yes | No (too slow) |
| **CI** | Yes | Yes |
| **Style/Format** | Yes | No |
| **Duplicate Code** | No | Yes |
| **O(n²) Detection** | Limited | Yes |
| **SRP Analysis** | No | Yes |

**Biome** provides instant feedback during development. **Thai-lint** catches deeper structural issues that Biome misses, running in CI where speed is less critical.

---

## Suppressing Rules

### Biome

```typescript
// biome-ignore lint/suspicious/noConsoleLog: Intentional logging
console.log('Debug output');
```

### Thai-lint

Add comments explaining why a pattern is acceptable:

```typescript
// thailint-ignore: magic-number - HTTP status codes are standard
const HTTP_OK = 200;
```

---

## Agent Responsibilities (Lint Ownership)

Agents are responsible for keeping lint green end-to-end. Do not defer lint failures to CI.

1. Run `npm run lint:fix`, then `npm run lint`.
2. Run Thai-lint locally (`thailint all src/` or `just thai-lint`).
3. Fix violations and re-run until clean.
4. Avoid suppressions; only use them with explicit, documented justification.
5. For the canonical agent rules, see `AGENTS.md` (Lint Ownership section).

---

## Recommended Workflow

1. **While coding**: Biome formats and checks in real-time
2. **On commit**: Husky runs lint-staged with Biome
3. **On PR**: GitHub Actions runs both Biome and Thai-lint
4. **Fix issues**: Address Thai-lint findings before merge
