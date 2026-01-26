# PR-020: Secret Remediation & Deployment Hygiene - Requirements

> **Status**: Draft
> **PR Branch**: `chore/020-secret-remediation`
> **Dependencies**: PR-002, PR-004, PR-018, PR-019

---

## Problem Statement

A public GitHub repository previously contained a MongoDB Atlas connection string. We need to remediate the leak, rotate credentials, and ensure deployment automation remains safe without storing secrets in GitHub. The goal is to keep secrets private while preserving a low‑touch CI/CD workflow.

---

## User Stories

### Story 1: Rotate and replace leaked credentials

**As a** maintainer
**I want** all leaked credentials rotated and replaced in runtime environments
**So that** the public leak cannot be exploited

#### Acceptance Criteria

```gherkin
Feature: Secret rotation

  Scenario: Leak remediation
    Given a public secret-scanning alert for a MongoDB Atlas URI
    When credentials are rotated
    Then the application uses only the new credentials
    And the old credentials no longer work
```

### Story 2: Remove leaked secret from git history

**As a** maintainer
**I want** the leaked secret removed from git history
**So that** it is no longer retrievable from the repository

#### Acceptance Criteria

```gherkin
Feature: History cleanup

  Scenario: History rewrite
    Given a leaked secret exists in git history
    When history is rewritten and force-pushed
    Then the secret is not present in any commit
    And the secret-scanning alert can be closed with confidence
```

### Story 3: Keep CI/CD automated with GitHub Secrets

**As a** maintainer
**I want** automated deploys without storing secrets in GitHub
**So that** the public repo stays safe and low‑maintenance

#### Acceptance Criteria

```gherkin
Feature: Vercel-managed deploys

  Scenario: Deploy automation
    Given the repository is public
    When code is pushed or PRs are opened
    Then GitHub Actions creates preview/production deployments
    And secrets are provided via GitHub Actions Secrets
```

### Story 4: Terraform automation uses GitHub Secrets

**As a** maintainer
**I want** Terraform automation in CI using GitHub Secrets
**So that** infrastructure changes are safe and predictable

#### Acceptance Criteria

```gherkin
Feature: Terraform automation

  Scenario: Terraform plan/apply in CI
    Given infrastructure is managed via Terraform
    When infra changes are opened in a PR
    Then Terraform plan runs with secrets from GitHub Actions
    And Terraform apply runs on merge to main
```

---

## Out of Scope

- Building new application features
- Migrating to a different hosting provider
- Replacing MongoDB Atlas entirely

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Secret-scanning alert resolution | Closed with rotation | GitHub alert status | 
| No secrets in repo history | 0 matches | `git grep` + secret scan | 
| Deploy automation | Vercel deploys on PR/push | Vercel dashboard | 

---

## Open Questions

- [ ] Do we want to rotate any other secrets beyond MongoDB (Grafana, Vercel token)?

---

## References

- docs/ENVIRONMENT.md
- docs/DEVELOPMENT.md
- GitHub secret-scanning alert #1
