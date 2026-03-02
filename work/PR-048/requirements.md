# PR-048: Passkey Localhost Origin Compatibility - Requirements

> **Status**: Approved
> **PR Branch**: `main`
> **Dependencies**: PR-008

---

## Problem Statement

Passkey authentication fails in local development when Next.js starts on a non-default port (for example `http://localhost:3001`) because WebAuthn verification expects `http://localhost:3000`.

---

## User Stories

### Story 1: Local developer signs in with passkey on non-default localhost port

**As a** developer
**I want** passkey auth to work when the app runs on `localhost` ports other than `3000`
**So that** local development remains reliable when port `3000` is occupied

#### Acceptance Criteria

```gherkin
Feature: Localhost passkey verification

  Scenario: Authenticate on localhost:3001 with app URL set to localhost:3000
    Given NEXT_PUBLIC_APP_URL is "http://localhost:3000"
    And the app is running at "http://localhost:3001"
    When the user completes passkey authentication
    Then verification accepts the response origin "http://localhost:3001"
    And the user is signed in successfully

  Scenario: Register passkey on localhost:3001 with app URL set to localhost:3000
    Given NEXT_PUBLIC_APP_URL is "http://localhost:3000"
    And the app is running at "http://localhost:3001"
    When the user completes passkey registration
    Then verification accepts the response origin "http://localhost:3001"
    And the credential is stored successfully
```

### Story 2: Production verification remains strict

**As a** maintainer
**I want** production origin checks to stay strict
**So that** passkey security behavior is not weakened

#### Acceptance Criteria

```gherkin
Feature: Production passkey origin verification

  Scenario: Non-localhost origin is not broadly relaxed
    Given the configured app URL is a non-localhost origin
    When passkey verification runs
    Then the configured expected origin remains required
    And no dynamic localhost fallback is applied
```

---

## Out of Scope

- Changes to passkey UX copy or screen flows
- Changes to RP ID (`WEBAUTHN_RP_ID`) configuration behavior

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Local passkey auth on fallback port | 100% success in manual test | Run dev on `:3001`, complete passkey authentication |
| Regression risk | None in lint/typecheck | `npm run lint` and `npm run typecheck` pass |

---

## Open Questions

- [ ] None

---

## References

- `src/lib/auth/passkey.ts`
- `src/app/api/auth/passkey/authenticate/route.ts`
- `src/app/api/auth/passkey/register/route.ts`
