# PR Working Documents

This directory contains living documents for active PR development. Documents here are **temporary** and should be cleaned up after PR completion.

## Structure

```
work/
├── TEMPLATES/           # Copy these to start a new PR
│   ├── requirements.md  # BDD-style requirements
│   ├── design.md        # Technical design
│   └── progress.md      # Progress, prompts, tests
├── PR-004/              # Active PR work
│   ├── requirements.md
│   ├── design.md
│   └── progress.md
└── README.md            # This file
```

## Starting a New PR

1. Create PR directory:
   ```bash
   mkdir work/PR-XXX
   ```

2. Copy templates:
   ```bash
   cp work/TEMPLATES/*.md work/PR-XXX/
   ```

3. Register deliverables in `scripts/deliverables.yaml`:
   ```yaml
   PR-XXX:
     name: "Your PR Name"
     checks:
       - type: file
         path: src/path/to/expected/file.ts
       - type: dir
         path: src/path/to/expected/directory
   ```

4. Update file headers with PR details

5. Work through documents in order:
   - **requirements.md** first - define the problem and success criteria
   - **design.md** second - technical approach
   - **progress.md** third - break into phases and agent prompts

## Document Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUIREMENTS.MD                          │
│  Draft → Review → Approved                                  │
│  [BDD scenarios, acceptance criteria, scope]                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DESIGN.MD                              │
│  Draft → Review → Approved                                  │
│  [Architecture, API, DB, components, testing strategy]      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     PROGRESS.MD                             │
│  Not Started → In Progress → Testing → Complete             │
│  [Phases, agent prompts, test results, session logs]        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       CLEANUP                               │
│  - Delete work/PR-XXX/ directory                            │
│  - Update permanent docs in docs/                           │
│  - Verify `python scripts/progress.py` shows complete       │
│  - Deliverables stay in scripts/deliverables.yaml (history) │
└─────────────────────────────────────────────────────────────┘
```

## Agent Handoff

The `progress.md` file contains structured prompts for AI agents. Each phase includes:

- **Dependencies**: What must complete first
- **Deliverables**: Files to create/modify
- **Agent Prompt**: Copy-paste ready prompt with context
- **Verification**: How to confirm completion

### Parallel Work

When phases can run in parallel, `progress.md` shows:
- Which streams can execute simultaneously
- Merge points where streams must sync
- Separate prompts for each stream

### Session Logging

After each work session, log:
- What was completed
- Issues encountered
- Next steps

This creates an audit trail and helps the next agent (or human) continue.

## Cleanup Rules

From `AGENTS.md` documentation hygiene requirements:

1. **Delete PR directory** after merge - these are not permanent docs
2. **Migrate learnings** to permanent docs (`docs/*.md`) if valuable
3. **No orphaned files** - everything links to something or gets deleted

## Templates Location

Templates are in `work/TEMPLATES/`. Do not modify templates directly - copy them to your PR directory first.
