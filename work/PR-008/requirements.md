# PR-008: Auth - Passkeys - Requirements

> **Status**: Draft
> **PR Branch**: `feat/pr-008-passkeys`
> **Dependencies**: PR-006 (Database Schema), PR-007 (Auth - Magic Links)

---

## Problem Statement

Magic links work well but require email access and add friction for frequent use. We need passkey
support so family members can sign in quickly with platform authenticators while keeping the
existing magic link flow as a fallback. We also need access control so only approved emails can
sign up, with invitations for family members to bring others in.

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

### Story 3: Control access with allowlist + invitations

**As an** owner
**I want** to control who can sign up via an allowlist and invitations
**So that** only approved people can access the app

#### Acceptance Criteria

```gherkin
Feature: Allowlist enforcement

  Scenario: Block non-allowlisted email
    Given an email is not on the allowlist
    When a magic link is requested
    Then the API returns success without sending email

  Scenario: Reject verification when removed
    Given an email is removed from the allowlist
    When a valid magic link is verified
    Then sign-in is rejected with a not_allowed error

  Scenario: Invite a new family member
    Given I am the owner
    When I invite a new email as family or friend
    Then an allowlist entry is created

  Scenario: Family invites friend only
    Given I am a family member
    When I invite a friend role
    Then the allowlist entry is created
    And inviting a family role is rejected
```

---

## Out of Scope

- Passkey deletion or renaming
- Account recovery flows beyond existing magic links
- MFA or TOTP integration
- Enterprise attestation requirements
- Allowlist management UI (API only)

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
- [ ] Should we add allowlist management UI in a future PR?

---

## References

- `docs/AUTH.md`
- `docs/ENVIRONMENT.md`
- `docs/OBSERVABILITY.md`
