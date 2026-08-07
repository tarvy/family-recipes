# PR-059: Content-Width Actions (Passkey / Button Stretch) - Requirements

> **Status**: Approved (user-reported design defect)
> **PR Branch**: `cursor/passkey-button-width-ba6a`
> **Dependencies**: PR-058

---

## Problem Statement

Destructive and secondary actions that stretch to the full width of a wide card look wrong — especially on desktop Settings. A design system that is “ironclad” must make content-width the default for actions, and reserve full-bleed buttons for intentional primary submits in narrow stacks (auth, empty states).

---

## User Stories

### Story 1: Buttons do not stretch by default

**As a** user on desktop Settings
**I want** action buttons to size to their label
**So that** destructive or secondary actions do not dominate a wide card

#### Acceptance Criteria

```gherkin
Feature: Content-width buttons

  Scenario: Default Button width
    Given I render a Button inside a full-width flex column card
    When the page is viewed on desktop
    Then the button width matches its label (plus padding), not the card width

  Scenario: Intentional full width
    Given a primary auth/submit CTA needs full bleed
    When the developer passes fullWidth
    Then the button spans its container
```

### Story 2: Design system documents the rule

**As an** AI agent or developer
**I want** DESIGN.md to forbid full-bleed destructive list actions
**So that** this anti-pattern is not reintroduced

---

## Out of Scope

- Building a full passkey revoke/delete API (unless already present)
- Redesigning the entire Settings page
