# AI Agent Instructions

This repository is designed for AI-agent maintainability. All AI agents (Claude Code, Cursor, Copilot, etc.) working in this codebase MUST follow these instructions.

---

## Quick Reference

### Tech Stack

Next.js 15 + React 19 + MongoDB Atlas + Mongoose + Tailwind CSS + Biome + Thai-lint

### System Architecture

```
CLIENTS (Web/PWA, Claude Code, Cursor)
         │
         ▼
    Vercel: Next.js 15 App Router
    ├── /app/*        (Pages, SSR/SSG)
    ├── /api/*        (REST endpoints)
    └── /mcp          (MCP server, OAuth 2.1)
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
MongoDB   Git Repo      Vercel Blob
(metadata) (.cook files)  (photos)
```

### Key Data Flows

- **Source of Truth**: Cooklang files (`.cook`) in `recipes/` directory
- **Sync**: Git push → files parsed → MongoDB metadata updated
- **Auth**: Magic links + Passkeys → JWT sessions (httpOnly cookies)
- **MCP**: OAuth 2.1 with PKCE, scopes: `recipes:read`, `shopping:read`, `shopping:write`

### Common Commands

```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run build        # Production build
npm run lint         # Run Biome linter
npm run lint:fix     # Auto-fix lint issues
npm run typecheck    # TypeScript type checking
python scripts/progress.py  # Check PR progress status
thailint all src/    # Run Thai-lint locally
```

### Pre-Commit Checklist

```bash
npm run lint:fix && npm run lint && npm run typecheck
```

---

## MANDATORY: Work Tracking Gate

**This is non-negotiable. There are no exceptions. Do not reason around this.**

Before writing, modifying, or deleting any code in this repository, you MUST:

1. **Verify a `work/PR-XXX/` directory exists** for the work you are about to do
2. **Read the `requirements.md`** in that directory - confirm it has defined acceptance criteria
3. **Read the `design.md`** in that directory - confirm a technical approach exists
4. **Find your phase in `progress.md`** - this is your mandate

If any of these are missing or incomplete: **STOP. Do not proceed.**

### You Do Not Decide What Is "Small"

Agents are forbidden from unilaterally deciding that a task is:
- "Too small to track"
- "Just a quick fix"
- "Simple enough to skip process"
- "Obvious and doesn't need documentation"

You do not have the authority to waive this process. Only the user does.

### When You Think Process Might Not Apply

If you believe a task might not require full tracking, you MUST:

1. **Stop before any implementation**
2. **Ask the user explicitly:**
   > "This request would normally require work tracking (work/PR-XXX/). Should I:
   > 1. Create the tracking documents (recommended)
   > 2. You explicitly waive tracking for this task"
3. **Wait for a clear answer**
4. **If the user waives tracking**, note this in your response and proceed
5. **If unclear**, default to creating tracking

### Why This Exists

AI agents are prone to:
- Optimizing for speed over process
- Rationalizing shortcuts as "efficiency"
- Underestimating scope and complexity
- Losing context across sessions

This process exists to prevent those failure modes. Follow it.

---

## Required Tenants

### 1. Observability First
- All new code MUST include appropriate logging via `src/lib/logger.ts`
- Database queries MUST be traced via `src/lib/telemetry.ts`
- API routes MUST include span context using `withTrace()`
- Never swallow errors silently - log and re-throw or handle explicitly
- See `docs/OBSERVABILITY.md` for usage examples

### 2. Code Quality Gates
- Run `npm run lint` before committing
- Run `npm run typecheck` before committing
- All code MUST pass Biome checks (see `biome.json`)
- All code MUST pass Thai-lint checks in CI (see `.thailint.yaml`)

### 2a. Lint Ownership (Agents)
- The agent owns lint health end-to-end; do not defer Biome or Thai-lint failures to CI
- Run `npm run lint:fix` then `npm run lint`, and run Thai-lint locally (see `docs/LINTING.md`)
- Fix violations rather than suppressing rules; only suppress with documented justification
- More details: see `docs/LINTING.md` (Agent Responsibilities section)

### 3. Documentation Hygiene
- **Keep docs current**: When modifying code, update related documentation
- **Remove stale docs**: Delete research notes, implementation plans, or temporary docs after feature completion
- **No orphaned docs**: Every `.md` file in `docs/` must be linked from README.md or another doc
- **Inline comments**: Only add comments where logic isn't self-evident; prefer clear code over comments

### 4. Type Safety
- TypeScript strict mode is enabled - no escape hatches
- Never use `any` type - use `unknown` and narrow appropriately
- No `@ts-ignore` or `@ts-expect-error` without justification comment
- All function parameters and returns must be typed

### 5. Security
- Never commit secrets or credentials
- Validate all user input at system boundaries
- Use Mongoose models for database access (prevents injection)
- No `dangerouslySetInnerHTML` without sanitization

---

## PR Workflow

Each PR has living documents in `work/PR-XXX/`:

| Document | Purpose | Format |
|----------|---------|--------|
| `requirements.md` | Problem definition, acceptance criteria | BDD/Gherkin scenarios |
| `design.md` | Technical approach, architecture | Diagrams, API specs, schemas |
| `progress.md` | Implementation tracking, agent prompts | Phases, tests, session logs |

### Planning New Work (Claude Code)

When a user requests a new feature or significant change, follow this workflow:

1. **Enter Plan Mode** - Use `EnterPlanMode` tool to formally enter planning mode
2. **Research with Explore Agents** - Use `Task` tool with `subagent_type=Explore` to:
   - Understand existing patterns in the codebase
   - Find relevant files and integration points
   - Research technical requirements
3. **Design with Plan Agent** - Use `Task` tool with `subagent_type=Plan` to:
   - Create high-level technical design
   - Define component architecture
   - Identify implementation phases
4. **Refine with Clarity Specialist** - Use `Task` tool with `subagent_type=agent-clarity-specialist` to:
   - Transform the plan into implementation-ready detail
   - Add specific file paths, code snippets, validation steps
   - Create unambiguous agent prompts for each phase
5. **Write Work Tracking Documents** - Create `work/PR-XXX/` with:
   - `requirements.md` - User stories, acceptance criteria (Gherkin)
   - `design.md` - Technical approach from Plan agent
   - `progress.md` - Phased implementation from Clarity Specialist
6. **Add Deliverables** - Update `scripts/deliverables.yaml` with expected files
7. **Exit Plan Mode** - Use `ExitPlanMode` tool to request user approval

**Do NOT skip steps.** The agent cascade (Explore → Plan → Clarity Specialist) ensures thorough research and unambiguous implementation guides.

### Starting a PR

```bash
mkdir work/PR-XXX
cp work/TEMPLATES/*.md work/PR-XXX/
# Add deliverables to scripts/deliverables.yaml
```

### Working a PR

1. Read `requirements.md` - understand what success looks like
2. Read `design.md` - understand how to build it
3. Find your phase in `progress.md` - get your specific prompt
4. Execute the prompt, verify with tests
5. Log your session in `progress.md`

### Completing a PR

1. Delete `work/PR-XXX/` directory
2. Update permanent docs in `docs/`
3. Verify `python scripts/progress.py` shows complete

See `work/README.md` for full details.

---

## Behaviors

### Before Starting Work

**First, satisfy the Work Tracking Gate (see above).** Nothing below matters if tracking isn't in place.

Once tracking is confirmed:
1. Read `docs/ARCHITECTURE.md` to understand system design
2. Check `.progress.json` or run `python scripts/progress.py` to see current state
3. Identify which PR your work falls under
4. Read the PR's `work/PR-XXX/requirements.md` and `work/PR-XXX/design.md`
5. Find your assigned phase in `progress.md` before touching any code

### During Development
1. Follow existing patterns in the codebase
2. Keep changes focused - one logical change per commit
3. Update progress tracker after completing PR deliverables

### Before Committing
1. Run `npm run lint:fix` to auto-fix formatting
2. Run `npm run typecheck` to verify types
3. Verify pre-commit hook passes (Husky + lint-staged)
4. Update relevant documentation
5. Thai-lint is enforced in CI; run it locally when working on core logic or before a PR if possible

### After Completing Features
1. Remove any temporary research files or notes
2. Update `docs/` if behavior changed
3. Verify feature works manually or via tests
4. Run `python scripts/progress.py` to update status

---

## Architecture Reference

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, data flow, database schemas |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | All credentials, API keys, external service setup |
| [`docs/LINTING.md`](docs/LINTING.md) | Biome + Thai-lint configuration and usage |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Local development setup, workflow, CI/CD |
| [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md) | Logging patterns, Vercel logs, telemetry |
| [`docs/COOKLANG.md`](docs/COOKLANG.md) | Recipe format, parsing, sync process |
| [`docs/MCP.md`](docs/MCP.md) | MCP server tools, OAuth 2.1, AI integration |

---

## Code Conventions

### File Organization
- Components: `src/components/{feature}/{component}.tsx`
- Pages: `src/app/(group)/route/page.tsx`
- API routes: `src/app/api/{resource}/route.ts`
- Utilities: `src/lib/{domain}/{function}.ts`
- Database: `src/db/models/*.model.ts`, `src/db/connection.ts`

### Naming
- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case`

### Imports
- Use `@/*` path alias for all imports from `src/`
- Biome auto-organizes imports on save
- No relative imports that go up more than one level

---

## Thai-lint Rules

Thai-lint runs in CI to catch AI-generated anti-patterns. Key checks:

| Rule | Threshold | Purpose |
|------|-----------|---------|
| `dry` | 5 lines | No duplicate code blocks |
| `nesting` | 4 levels | Flatten deep nesting |
| `magic-numbers` | Allow 0,1,-1,100 | Name your constants |
| `srp` | 10 methods | Split large classes |
| `file-header` | Required | Documentation headers for key files |
| `lazy-ignores` | Forbidden | No unjustified lint suppressions |
| `print-statements` | Forbidden | No console.log in production code |

Fix violations before merge. See `docs/LINTING.md` for details.

---

## Forbidden Patterns

1. **No `any` types** - Use `unknown` and type guards
2. **No console.log** - Use `src/lib/logger.ts`
3. **No magic numbers** - Define named constants
4. **No deep nesting** - Extract functions, use early returns
6. **No duplicate code** - Extract shared utilities
6. **No orphaned documentation** - Delete or link all docs
7. **No skipping tests** - Fix failing tests, don't skip them
8. **No force push to main** - Use PRs and proper git workflow
9. **No credentials in code** - Use environment variables
10. **No untyped API responses** - Define interfaces for all external data

---

## Progress Tracking

Run the deterministic progress script to check/update status:

```bash
python scripts/progress.py
```

This outputs:
- Terminal summary of all PR statuses
- `.progress.json` with machine-readable state

The script checks file existence - no AI reasoning. If a deliverable file exists, it's marked complete.

### Adding New PRs to Progress Tracking

Deliverables are defined in `scripts/deliverables.yaml`. When creating a new PR:

```yaml
PR-XXX:
  name: "Human-readable PR name"
  checks:
    - type: file
      path: src/path/to/expected/file.ts
    - type: dir
      path: src/path/to/expected/directory
```

The YAML config is the source of truth - edit it directly to add, modify, or update deliverables.

---

## Getting Help

- Project structure: See `docs/ARCHITECTURE.md`
- Credentials setup: See `docs/ENVIRONMENT.md`
- Linting issues: See `docs/LINTING.md`
- Database schema: See `src/db/models/` directory
- Current progress: Run `python scripts/progress.py`
