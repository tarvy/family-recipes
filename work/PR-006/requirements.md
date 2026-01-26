# PR-006: Database Schema - Requirements

> **Status**: Draft
> **PR Branch**: `feat/006-database-schema`
> **Dependencies**: PR-001, PR-002, PR-003, PR-005

---

## Problem Statement

The application needs a canonical database schema and Drizzle configuration so future features can
store and query users, recipes, and shopping data consistently. This PR establishes the schema
foundation and tooling without adding business logic or API endpoints.

---

## User Stories

### Story 1: Developer scaffolds the schema

**As a** developer
**I want** the Postgres schema defined in Drizzle
**So that** subsequent features can build queries and migrations consistently

#### Acceptance Criteria

```gherkin
Feature: Database schema scaffolding

  Scenario: Core tables are defined in Drizzle
    Given the schema module is loaded
    When I inspect the exported tables
    Then all auth, recipe, and shopping tables exist
    And each table includes timestamps per architecture requirements

  Scenario: Drizzle config uses DATABASE_URL
    Given DATABASE_URL is set in the environment
    When I run drizzle-kit commands
    Then the schema loads without config errors
```

### Story 2: Developer can initialize a db client

**As a** developer
**I want** a typed db client and schema exports
**So that** API routes and query modules can share a single connection setup

#### Acceptance Criteria

```gherkin
Feature: Database client setup

  Scenario: db client is exported
    Given the db module is imported
    When I use the exported db client
    Then it is configured with the schema and connection string
```

---

## Out of Scope

- Query layer implementations and repository functions
- Data migrations or seed data
- API routes or UI changes

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Drizzle tooling ready | `drizzle.config.ts` loads | `drizzle-kit` reads config |
| Schema coverage | All tables in architecture doc | Compare `src/db/schema.ts` to docs |
| Type safety | 0 TypeScript errors | `npm run typecheck` |

---

## Open Questions

- [ ] Should `recipes.search_vector` be a generated column or managed by sync jobs?
- [ ] Do we need enumerations for recipe difficulty/cuisine/course now or later?

---

## References

- `docs/ARCHITECTURE.md`
- `docs/ENVIRONMENT.md`
