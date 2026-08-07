# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary (inferred from codebase + user brief):** Household members in a private family — an owner who administers access, family members who cook and plan meals together, and friends with limited recipe access. They use the product while planning grocery trips, cooking at the counter, and coordinating “what’s for dinner,” most often on an **iPhone** (Safari or installed PWA).

**Roles (confirmed in code):** `owner` | `family` | `friend` (allowlisted accounts only).

## Product Purpose

Family Recipes is a private, mobile-first PWA for keeping the household’s recipes, shopping lists, and weekly menus in one place. Recipes are authored in Cooklang and version-controlled; the app synthesizes shopping lists and supports weekly meal planning and family voting. Success means the family can find a recipe, cook from it, and shop for the week without leaving the shared system — including when used with AI agents via MCP.

## Positioning

Cooklang files in git are the source of truth for recipes, with MongoDB metadata, Blob photos, and an MCP server (`recipes:read`, `shopping:read`, `shopping:write`) for AI agents. This is not a public recipe social network; it is a private household operating system for cooking.

## Operating Context

- Kitchen / counter use on iPhone (thumb reach, one-handed, occasional wet hands)
- Weekly meal planning and grocery runs
- Cooking sessions with timers and pinned recipes
- Occasional desktop use for longer editing
- AI-assisted workflows through MCP OAuth clients

## Capabilities and Constraints

**Confirmed capabilities:** recipe browse/search/create/edit (Cooklang), scaling, photos, shopping list aggregation with swipe-to-check, weekly menu planner, public share links (`/r/[slug]`), public vote links, magic-link + passkey auth, installable PWA, MCP OAuth.

**Constraints:**
- Allowlist-only access (not open signup)
- Mobile-first is mandatory; iPhone Safari / Home Screen PWA is the primary runtime (**user brief**)
- Every page must feel cohesive under one visual system (**user brief**)
- Stack is the existing Next.js App Router + Tailwind v4 + React 19 codebase (not greenfield)

**Undecided:** whether friends remain permanently read-limited; future notification delivery for published menus.

## Brand Commitments

- **Name:** Family Recipes (text wordmark in header; biscuit/PWA icon in `public/icons/`)
- **Incumbent visual direction (binding until an explicit rebrand):** cozy “Cooking Mama / Grandma’s kitchen” language already encoded in `src/app/globals.css` — soft pink / yellow / lavender / gingham / cocoa, Nunito, rounded surfaces. Init does not invent a new aesthetic; documenting and hardening that world is in scope.
- **Voice:** warm, clear, kitchen-practical — not corporate SaaS, not trendy food-blog hype.

## Evidence on Hand

- Live token system: `src/app/globals.css`
- UI primitives: `src/components/ui/`
- Feature UIs: `src/components/{recipes,shopping,menu,cooking-session,navigation,pwa}/`
- PWA: `public/manifest.json`, apple web app metadata in `src/app/layout.tsx`
- Product docs: `README.md`, `docs/ARCHITECTURE.md`
- Do **not** fabricate testimonials, customer counts, or press.

## Product Principles

1. **Kitchen-first.** Design for the phone in a real kitchen before the desktop editor.
2. **One household system.** Recipes, lists, and menus share one visual and interaction language.
3. **Cooklang honesty.** The file format and git history stay the recipe authority.
4. **Agent-ready, human-owned.** MCP helps; the family still decides what to cook and buy.
5. **Scale by system, not by one-offs.** New UI must compose from shared tokens and primitives.

## Accessibility & Inclusion

- Target WCAG-minded contrast on cocoa text over gingham/cream/pink surfaces.
- Minimum **44×44 CSS px** touch targets for primary controls (iOS HIG-aligned for the web PWA).
- Respect iOS safe areas (notch / Dynamic Island / home indicator).
- Prefer readable type in bright kitchens; avoid relying on hover-only affordances.
- Note: root viewport currently disables user scaling (`userScalable: false`) for app-like behavior; any change must be an explicit product decision.
