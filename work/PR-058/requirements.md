# PR-058: Owner-Distributed Magic Links - Requirements

> **Status**: Draft
> **PR Branch**: `cursor/manual-magic-links-c785`
> **Dependencies**: PR-007, PR-008, PR-040

---

## Problem Statement

The current login flow depends on Resend to deliver magic links. For this personal,
single-owner application, the owner needs a reliable way to generate a short-lived,
single-use login link and distribute it manually, including during email-provider
outages.

---

## User Stories

### Story 1: Owner Generates a Login Link

**As the** application owner
**I want** to generate a one-time login link for an allowlisted email address
**So that** I can distribute access manually without an email provider

#### Acceptance Criteria

```gherkin
Feature: Owner-distributed magic links

  Scenario: Owner generates a link for an allowlisted email
    Given I am signed in as the owner
    And the target email is on the allowlist
    When I submit the target email in the admin magic-link form
    Then the application creates a 15-minute magic-link token
    And the response contains a copyable verification URL
    And the token is not written to application logs

  Scenario: Non-owner cannot generate a link
    Given I am signed in as a non-owner
    When I submit an admin magic-link request
    Then the request is rejected with HTTP 403
    And no token is created

  Scenario: Unallowlisted email is rejected
    Given I am signed in as the owner
    And the target email is not on the allowlist
    When I submit an admin magic-link request
    Then the request is rejected with a clear validation error
    And no token is created
```

### Story 2: Recipient Uses the Link

**As an** invited user
**I want** to use the manually distributed link once
**So that** I can establish a session and register a passkey

#### Acceptance Criteria

```gherkin
Feature: Consume a manually distributed magic link

  Scenario: Valid link creates a session
    Given the link is unused and less than 15 minutes old
    When I open the link
    Then I receive a session
    And I am redirected to the application

  Scenario: Link cannot be reused
    Given the link has already been used
    When I open the link again
    Then I am redirected to login with an invalid-token error

  Scenario: Link expires
    Given the link is older than 15 minutes
    When I open the link
    Then I am redirected to login with an invalid-token error
```

### Story 3: Remove Email Delivery Dependency

**As the** application owner
**I want** authentication to work without Resend
**So that** login is independent of email-provider availability

#### Acceptance Criteria

```gherkin
Feature: Resend-free authentication

  Scenario: Production authentication has no Resend requirement
    Given the application is deployed without RESEND_API_KEY
    When the owner generates a manual magic link
    Then link generation succeeds
    And authentication does not attempt an external email request
```

### Story 4: Revoke a Passkey

**As an** authenticated user
**I want** to delete a registered passkey
**So that** a lost, old, or compromised credential can no longer sign in

#### Acceptance Criteria

```gherkin
Feature: Revoke passkeys

  Scenario: User deletes their own passkey
    Given I am signed in
    And the passkey belongs to my account
    When I confirm deletion of that passkey
    Then the passkey is removed from the database
    And it can no longer authenticate me
    And the Settings list no longer shows it

  Scenario: User cannot delete another user's passkey
    Given I am signed in
    And the passkey belongs to another account
    When I submit a deletion request
    Then the request is rejected
    And the passkey remains registered

  Scenario: Deletion requires confirmation
    Given I am viewing a registered passkey
    When I select delete
    Then I see a confirmation prompt before the deletion request is sent
```

---

## Out of Scope

- Sending links through a new external provider.
- Public or unauthenticated link-generation endpoints.
- Bulk link generation.
- Extending link lifetime beyond the existing 15-minute policy.
- Displaying existing or previously generated tokens.
- Administrative deletion of passkeys belonging to other users.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Manual link generation | Works for owner and allowlisted emails | Manual production verification |
| Token security | Single-use and 15-minute expiry preserved | Integration tests |
| Resend dependency | No runtime dependency for authentication | Build and environment verification |
| Authorization | Non-owner requests rejected | Route tests/manual verification |

---

## Open Questions

- [x] Should links be manually distributed rather than emailed? **Yes.**
- [x] Should Resend remain in the authentication path? **No.**

---

## References

- `docs/AUTH.md`
- `src/lib/auth/magic-link.ts`
- `src/lib/auth/authorization.ts`
- `src/db/models/magic-link.model.ts`
