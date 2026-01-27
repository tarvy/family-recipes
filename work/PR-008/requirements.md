# PR-008: Auth - Passkeys - Requirements

> **Status**: Draft
> **PR Branch**: `feat/pr-008-passkeys`
> **Dependencies**: PR-006 (Database Schema), PR-007 (Auth - Magic Links)

---

## Problem Statement

Magic links work well but require email access and add friction for frequent use. We need passkey
support so family members can sign in quickly with platform authenticators while keeping the
existing magic link flow as a fallback.

---

## User Stories

### Story 1: Register a passkey in settings

**As a** signed-in user
**I want** to register a passkey from my settings page
**So that** I can sign in faster next time without email

#### Acceptance Criteria

```gherkin
Feature: Passkey registration

  Scenario: Register a new passkey
    Given I am signed in
    And I am on the settings page
    When I choose to add a passkey
    Then the browser prompts me to create a passkey
    And the passkey is stored on my account
    And I see the passkey listed in settings

  Scenario: Registration fails due to invalid response
    Given I am signed in
    And I attempt to add a passkey
    When the attestation response is invalid or expired
    Then the API returns an error
    And no passkey is stored
```

### Story 2: Sign in with a passkey

**As a** returning user
**I want** to sign in with a passkey
**So that** I can access my recipes without email

#### Acceptance Criteria

```gherkin
Feature: Passkey authentication

  Scenario: Authenticate with a passkey
    Given I am on the login page
    When I choose to sign in with a passkey
    Then the browser prompts me to use a passkey
    And a session is created
    And I am redirected to the home page

  Scenario: Authentication fails for unknown credential
    Given I am on the login page
    When I submit a passkey not registered to this account
    Then the API returns an error
    And I remain signed out
```

---

## Out of Scope

- Passkey deletion or renaming
- Account recovery flows beyond existing magic links
- MFA or TOTP integration
- Enterprise attestation requirements

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Passkey registration success rate | ≥ 90% | API success responses vs attempts |
| Passkey sign-in completion time | ≤ 5 seconds | Frontend timing logs |
| Support tickets for login friction | 0 new | Manual feedback |

---

## Open Questions

- [ ] Should passkeys require user verification (`UV`) or allow `preferred`?
- [ ] Do we want to support deleting passkeys in the same PR?
- [ ] Should passkey login be shown on the login page by default or behind a toggle?

---

## References

- `docs/AUTH.md`
- `docs/ENVIRONMENT.md`
- `docs/OBSERVABILITY.md`
