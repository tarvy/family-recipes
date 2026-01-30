# PR-032: MongoDB-Primary Architecture - Requirements

> **Status**: In Progress
> **Created**: 2026-01-30
> **Updated**: 2026-01-30

---

## Problem Statement

MCP recipe write tools (`recipe_create`, `recipe_update`) fail on Vercel production due to read-only filesystem constraint. Additionally, the filesystem-first architecture prevents real-time data access needed for automations and live updates.

## User Story

As a user, I want recipes stored in a live database so that I can add, modify, and query recipes in real-time from any device, enabling automations and instant access without deploy cycles.

## Decision

Selected approach: **Option C — MongoDB-primary with Git backup**

### Rationale

- Live data enables automations, schedules, exports
- Instant read-after-write (no 60s deploy wait)
- DB is always accessible from serverless
- Git becomes backup/archive, not bottleneck
- App UI will be primary editing interface (more friendly than IDE)

---

## Acceptance Criteria

### Core Behavior: Real-time Writes

**Scenario: Create recipe from MCP on production**
- Given the MCP server is running on Vercel
- When I call `recipe_create` with valid Cooklang content
- Then the recipe is saved to MongoDB immediately
- And the API returns a success response with the slug
- And the recipe is immediately queryable via `recipe_get` and `recipe_search`

**Scenario: Update recipe from MCP on production**
- Given an existing recipe in MongoDB
- When I call `recipe_update` with updated Cooklang content
- Then the recipe is updated in MongoDB immediately
- And the API returns a success response
- And subsequent reads reflect the update

**Scenario: Delete recipe from MCP on production**
- Given an existing recipe in MongoDB
- When I call `recipe_delete`
- Then the recipe is removed from MongoDB immediately
- And the API returns a success response

### Core Behavior: Real-time Reads

**Scenario: Read after write**
- Given I just created or updated a recipe
- When I immediately query for that recipe
- Then I receive the current version (no stale data)

### Backup: Weekly Git Export

**Scenario: Automated weekly backup**
- Given recipes exist in MongoDB
- When the weekly cron job runs
- Then all recipes are exported as `.cook` files to the GitHub repository
- And a commit is created with a descriptive message (e.g., "backup: weekly recipe export")
- And any recipes deleted from MongoDB are removed from git

### Backup: Manual Export

**Scenario: On-demand export via CLI**
- Given recipes exist in MongoDB
- When I run the export CLI command
- Then all recipes are exported as `.cook` files to GitHub
- And a commit is created

**Scenario: On-demand export via API/UI (future)**
- Given recipes exist in MongoDB
- When I trigger export from the admin UI
- Then all recipes are exported to GitHub

### Rare Path: IDE Editing

**Scenario: Edit Cooklang file in IDE and sync to DB**
- Given I edited a `.cook` file directly in my IDE
- And I pushed the change to GitHub
- When the GitHub Action runs
- Then the changed recipes are parsed and upserted to MongoDB
- And MongoDB reflects the IDE changes

### Error Handling

**Scenario: Invalid Cooklang content**
- Given a request with malformed Cooklang
- When I attempt to create or update a recipe
- Then the API returns a validation error with details
- And no partial data is written

**Scenario: Duplicate slug**
- Given a recipe with slug "french-75" exists
- When I attempt to create another recipe that would have slug "french-75"
- Then the API returns a conflict error
- And the existing recipe is unchanged

**Scenario: Export failure**
- Given the GitHub API is unavailable
- When a backup export runs
- Then the failure is logged with details
- And an alert/notification is sent (if configured)
- And MongoDB data is unaffected

---

## Out of Scope (Future)

- Recipe versioning/history in MongoDB (rely on git backups for now)
- Conflict resolution for simultaneous edits
- Real-time collaborative editing

---

## Dependencies

- PR-028 through PR-031 (MCP write tools) - Will be refactored to use MongoDB
- Existing MongoDB connection and Recipe model
- GitHub API access for backup exports
