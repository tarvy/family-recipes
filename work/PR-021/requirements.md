# PR-021: Terraform Remote State & Imports - Requirements

> **Status**: Draft
> **PR Branch**: `chore/021-terraform-remote-state`
> **Dependencies**: PR-018

---

## Problem Statement

Terraform runs in CI without remote state, so it loses awareness of existing
resources and fails with "already exists" errors. We need a shared remote
state backend and to import existing resources to make Terraform idempotent.

---

## User Stories

### Story 1: Remote state for CI

**As a** maintainer  
**I want** Terraform state stored remotely  
**So that** CI runs are consistent and aware of existing resources

#### Acceptance Criteria

```gherkin
Feature: Terraform remote state

  Scenario: CI uses shared state
    Given Terraform Cloud is configured
    When Terraform runs in CI
    Then the same remote state is used for plan/apply
    And existing resources are not re-created
```

### Story 2: Import existing resources

**As a** maintainer  
**I want** existing Atlas/Vercel/Grafana resources imported  
**So that** plans are clean and idempotent

#### Acceptance Criteria

```gherkin
Feature: Terraform import

  Scenario: Resource imports
    Given resources already exist in cloud providers
    When they are imported into Terraform state
    Then Terraform plan shows no unexpected creates
```

---

## Out of Scope

- Creating new infrastructure resources
- Changing cloud providers

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Remote state configured | Yes | `terraform init` uses cloud backend |
| No duplicate resource errors | 0 | CI Terraform plan/apply output |

---

## Open Questions

- [ ] Terraform Cloud organization and workspace names

---

## References

- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
