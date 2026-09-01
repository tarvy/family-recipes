# PR-062: Design System Index + Architecture Harden - Requirements

> **Status**: Approved (user-requested via /impeccable)
> **PR Branch**: `cursor/design-system-harden-ba6a`
> **Dependencies**: PR-058

---

## Problem Statement

The cozy-kitchen design world exists in CSS and thin UI primitives, but DESIGN.md has drifted from code, PageShell/Badge are unused, tokens/constants are duplicated, and raw buttons/cards proliferate. We need an accurate index of the incumbent system and a harder architecture so new UI scales on-brand (especially iPhone).

---

## User Stories

### Story 1: Indexed design system

**As an** AI agent or developer
**I want** DESIGN.md + sidecar refreshed from the live codebase
**So that** documentation matches reality

### Story 2: Hardened token & primitive architecture

**As a** developer
**I want** a single token source, shared FormField/Alert, content-width Buttons, and PageShell on main routes
**So that** screens compose from the system instead of one-offs

#### Acceptance Criteria

```gherkin
Feature: Design system harden

  Scenario: Document refresh
    Given the incumbent globals.css and ui kit
    When /impeccable document completes
    Then DESIGN.md and .impeccable/design.json reflect shipped tokens and components

  Scenario: Architecture
    Given main app routes
    When I open Recipes, Menu, Shopping, Settings
    Then each uses PageShell for page chrome
    And Button defaults to content width
    And FormField and Alert exist in src/components/ui
    And touch/breakpoint constants resolve through design-system
```

## Out of Scope

- Migrating every raw `<button>` in the app (follow-up extract)
- Visual rebrand / new Creative North Star
- Native iOS app
