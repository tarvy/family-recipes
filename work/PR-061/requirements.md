# PR-061: Fix PWA Client-Side Exception - Requirements

> **Status**: Approved (production incident)
> **PR Branch**: `cursor/fix-pwa-client-exception-95c2`
> **Dependencies**: PR-016 (PWA / service worker)

---

## Problem Statement

iPhone users (especially Add-to-Home-Screen / PWA) intermittently see Next.js's
full-page error:

> Application error: a client-side exception has occurred while loading
> family-recipes-khaki.vercel.app

Fresh browsers load `/login` fine. The service worker uses
**stale-while-revalidate for HTML navigations** and **precaches HTML routes**,
so after a Vercel deploy the SW can serve an old document that references
missing or mismatched `/_next/static` chunks. That throws during client boot
and matches the reported mobile failure mode.

---

## User Stories

### Story 1: Reliable load after deploy

**As a** family member using the iPhone home-screen app  
**I want** the app to load the current deployment  
**So that** I do not see a blank client-side exception screen after updates

#### Acceptance Criteria

```gherkin
Feature: Fresh navigations after deploy

  Scenario: Online navigation prefers network HTML
    Given the service worker is controlling the page
    And a newer deployment is live on Vercel
    When the user opens the app while online
    Then the document HTML comes from the network (not a stale cache entry)
    And the page hydrates without a client-side exception

  Scenario: Precache does not pin HTML shells
    Given the service worker installs
    When precache runs
    Then HTML app routes such as /, /recipes, and /shopping-list are not precached
```

### Story 2: Recover from a poisoned cache

**As a** user stuck on the Application error screen  
**I want** a one-tap recovery path  
**So that** clearing stale caches restores the app without Safari settings gymnastics

#### Acceptance Criteria

```gherkin
Feature: Cache recovery

  Scenario: Chunk load failure auto-recovers once
    Given a stale cache causes a Next.js chunk load failure
    When the client detects the failure
    Then caches are cleared and the page reloads at most once per session

  Scenario: Global error UI offers reload
    Given an uncaught client render error
    When the global error boundary renders
    Then the user sees a Reload control that refreshes the app
```

---

## Scope

### In Scope

- Service worker caching strategy for navigations and precache list
- Cache version bump to invalidate existing `v1` caches
- Client-side recovery for chunk/load failures
- Minimal global error UI with reload

### Out of Scope

- Full offline recipe browsing redesign
- Changing auth, recipes API, or MCP
- New PWA install UX / screenshots

---

## Success Metrics

- Production iPhone / PWA opens without the Application error screen when online
- After deploy, controlling clients receive current HTML on next navigation
