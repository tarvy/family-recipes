# PR-058: Impeccable Design System Foundation - Requirements

> **Status**: Approved (user-requested)
> **PR Branch**: `cursor/design-system-impeccable-ba6a`
> **Dependencies**: None

---

## Problem Statement

Family Recipes has a coherent “cozy kitchen” visual direction in `globals.css`, but it is not captured as an agent-readable product/design authority, UI primitives are thin and inconsistently adopted, and mobile/iOS runtime details (safe areas, 44pt touch targets, semantic success colors) are incomplete. Agents and humans cannot scale the UI reliably without an ironclad design system.

---

## User Stories

### Story 1: Durable product context for agents

**As a** developer or AI agent
**I want** a root `PRODUCT.md` from Impeccable init
**So that** every design decision stays grounded in who the product is for

#### Acceptance Criteria

```gherkin
Feature: PRODUCT.md authority

  Scenario: Product record exists
    Given Impeccable has been initialized
    When an agent starts design work
    Then PRODUCT.md exists at the project root
    And it includes platform, users, purpose, positioning, and iPhone-first constraints
```

### Story 2: Documented visual system

**As a** developer or AI agent
**I want** a root `DESIGN.md` (and Impeccable sidecar) extracted from the incumbent UI
**So that** new screens stay on-brand without reinventing tokens

#### Acceptance Criteria

```gherkin
Feature: DESIGN.md authority

  Scenario: Visual system documented
    Given the existing cozy-kitchen tokens and components
    When /impeccable document completes
    Then DESIGN.md captures colors, type, layout, elevation, shapes, components, and guardrails
    And .impeccable/design.json carries motion, shadows, breakpoints, and component snippets
```

### Story 3: Scalable UI primitives + tokens

**As a** developer
**I want** typed design-system tokens and reusable UI primitives with mobile-safe defaults
**So that** every page composes from the same building blocks

#### Acceptance Criteria

```gherkin
Feature: Design system kit

  Scenario: Tokens and primitives
    Given the design system foundation is merged
    When I build a new screen
    Then I can import tokens/constants from src/lib/design-system
    And Button/Card/Input/Badge/PageShell/EmptyState live under src/components/ui
    And primary controls meet a 44px minimum touch target

  Scenario: iOS safe areas
    Given the app runs as a PWA on iPhone
    When a fixed header or bottom banner is shown
    Then content respects safe-area-inset-top and safe-area-inset-bottom
    And viewport-fit=cover is set so insets apply
```

### Story 4: Visual cohesion fixes

**As a** family member using the app on an iPhone
**I want** every page to use the same palette and surfaces
**So that** the app feels like one product

#### Acceptance Criteria

```gherkin
Feature: Cohesion

  Scenario: No off-brand token drift in foundation surfaces
    Given foundation surfaces are updated
    Then PWA update banner uses brand accent (not undefined bg-sunny)
    And recipe empty state uses muted semantic tokens (not gray-*)
    And success/positive states use design-system success tokens (not ad-hoc Tailwind green)
```

---

## Out of Scope

- Full redesign / rebrand of the cozy-kitchen world
- Migrating every raw `<button>` in the app to `Button` in this PR
- Bottom tab bar navigation overhaul
- Native iOS (SwiftUI) app
- Completing PR-057 menu publish flow

---

## Success Metrics

| Metric | Target |
|--------|--------|
| PRODUCT.md + DESIGN.md present | Yes |
| Lint + typecheck | Pass |
| Safe-area utilities + viewport-fit | Present |
| 44px touch target constant + Button defaults | Present |
| Docs linked from README | Yes |
