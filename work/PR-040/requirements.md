# PR-040: Audit Logging System

## Problem Statement

Recipes created via MCP (or any source) leave no queryable trace. Vercel Hobby retains logs for only 1 hour. There is no way to verify what happened after the fact.

## User Stories

### As a system operator, I want to see a history of recipe CRUD operations
**Given** recipes are created, updated, or deleted via MCP/API/web
**When** I query the audit log
**Then** I see timestamped records of each operation with source, slug, and message

### As a system operator, I want to query audit logs from the CLI
**Given** audit events are stored in MongoDB
**When** I run `npm run logs -- list --source mcp --since 24h`
**Then** I see filtered, formatted results

### As a system operator, I want audit data to auto-expire
**Given** audit logs accumulate over time
**When** 30 days have passed
**Then** MongoDB TTL index automatically removes old entries

## Acceptance Criteria

- [ ] `audit()` helper fires and forgets — never blocks recipe operations
- [ ] All recipe CRUD operations (create, update, delete) produce audit events
- [ ] MCP operations are tagged with `source: 'mcp'`
- [ ] CLI supports `list`, `search`, and `stats` commands
- [ ] TTL index set to 30 days (2592000 seconds)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
