---
name: Family Recipes
description: Cozy kitchen PWA for private household recipes, shopping, and weekly menus
colors:
  pink: "#FED4D9"
  pink-dark: "#F5B8C0"
  pink-light: "#FFF0F2"
  yellow: "#EFEBBA"
  yellow-dark: "#E5DF8A"
  yellow-light: "#F9F8E6"
  lavender: "#AF93B3"
  lavender-dark: "#937598"
  lavender-light: "#D4C6D6"
  gingham: "#FBF6E3"
  cream: "#FFFEF9"
  cocoa: "#4A3728"
  background: "#FBF6E3"
  foreground: "#4A3728"
  card: "#FFFFFF"
  card-nested: "#F9F8F4"
  primary: "#FED4D9"
  secondary: "#AF93B3"
  accent: "#EFEBBA"
  muted: "#F5F3EE"
  muted-foreground: "#7A6B5C"
  destructive: "#E57373"
  success: "#5B8F6B"
  success-foreground: "#FFFFFF"
  success-soft: "#E8F2EB"
  warning: "#C4A35A"
  warning-soft: "#F7F0DD"
  info: "#6B8F9E"
  info-soft: "#E8F1F4"
  border: "#E8E4DC"
  ring: "#AF93B3"
typography:
  display:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  page-x: "1.5rem"
  page-y: "1.5rem"
  section: "1.5rem"
  stack: "1rem"
  touch: "2.75rem"
  header: "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.pink-dark}"
    textColor: "{colors.foreground}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
    height: "{spacing.touch}"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0"
  card-section:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "{spacing.touch}"
  badge-default:
    backgroundColor: "{colors.pink-light}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  badge-active:
    backgroundColor: "{colors.lavender}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  alert-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
  alert-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
---

# Design System: Family Recipes

## Overview

**Creative North Star: "Grandma's Cozy Kitchen Table"**

Family Recipes is a private household cooking PWA that should feel like a warm kitchen table under a butter-gingham cloth — inviting, rounded, and soft-spoken. Soft pink leads brand and chrome; lavender marks selection; yellow is garnish; cocoa carries all reading text. The system is domestic, not SaaS and not food-blog lifestyle.

This file was refreshed via `/impeccable document` (scan mode) against `src/app/globals.css` and `src/components/ui/*` on 2026-09-01. Tokens in frontmatter are normative; CSS `@theme` is the runtime source of truth.

**Key Characteristics:**
- Gingham tablecloth page field with white card islands
- Soft pink header chrome and primary CTAs
- Nunito everywhere — rounded, friendly, never clinical
- Cocoa-tinted shadows and borders (never cold gray UI chrome)
- iPhone-first: 44px touch targets + safe-area insets
- Three-layer surfaces: page → card → nested inset
- Content-width actions by default; full-bleed only when opted in

## Colors

A warm domestic palette: pastry pink, butter yellow, soft lavender, gingham butter, and cocoa.

### Primary
- **Pastry Pink** (`#FED4D9`): Brand chrome, primary buttons, theme color.

### Secondary
- **Hearth Lavender** (`#AF93B3`): Selection, active filters, focus ring, progress.

### Tertiary
- **Butter Yellow** (`#EFEBBA`): Accent warmth — highlights and banners, never the primary CTA fill.

### Neutral
- **Gingham Butter** (`#FBF6E3`): Page background under the tablecloth pattern.
- **Card White** (`#FFFFFF`) / **Nested Linen** (`#F9F8F4`): Content surfaces.
- **Cocoa** (`#4A3728`): Primary text.
- **Mushroom** (`#7A6B5C`): Secondary text.
- **Linen Border** (`#E8E4DC`): Borders and inputs.

### Semantic
- **Berry Soft** (`#E57373`): Destructive.
- **Herb Success** (`#5B8F6B` + soft `#E8F2EB`): Positive completion.
- **Honey Warning** (`#C4A35A` + soft `#F7F0DD`): Caution / non-blocking alerts.
- **Sky Info** (`#6B8F9E` + soft `#E8F1F4`): Neutral informational alerts.

**The One Accent Voice Rule.** Pink owns primary action; lavender owns selection; yellow is garnish. Do not invent a fourth brand accent for variety.

**The No Cold Gray Rule.** Prefer cocoa/mushroom/linen tokens over Tailwind `gray-*` or blue SaaS links in product UI.

## Typography

**Display / Body Font:** Nunito (ui-sans-serif / system-ui fallback)

**Character:** Softly rounded and neighborly — recipe cards transcribed into a clean app.

### Hierarchy
- **Display** (600, `text-3xl` / 1.875rem): Page titles.
- **Headline** (600, `text-xl` / 1.25rem): Section headers.
- **Title** (600, `text-lg` / 1.125rem): Card titles.
- **Body** (400, `text-base` / 1rem, 1.5): Instructions and descriptions.
- **Label** (500, `text-sm` / 0.875rem): Form labels, meta, helpers.

**The Single Family Rule.** Do not introduce Inter, Roboto, or a second display face.

## Layout

Mobile-first Operate mode. Page chrome uses `PageShell` (`px-6 py-6` + max-width presets: auth `max-w-md`, reading `max-w-3xl`, detail `max-w-5xl`, browse `max-w-6xl`). Header content height is 56px plus `safe-area-inset-top`. Mobile navigation is a left drawer below `md` (768px); desktop shows inline header links. No bottom tab bar.

**The Thumb-First Rule.** Primary actions must work in a one-handed iPhone portrait grip.

**The Safe Stage Rule.** Fixed top/bottom chrome pads Apple safe-area insets (`pt-safe` / `pb-safe`).

**The Content-Width Action Rule.** Buttons size to their label by default (`w-fit`). Full-bleed (`fullWidth`) is reserved for primary submits in narrow stacks (auth, empty states). Never stretch destructive or secondary actions across a wide settings/list card.

## Elevation & Depth

Hybrid: flat gingham field + softly lifted white cards. Shadows are cocoa-tinted and gentle.

### Shadow Vocabulary
- **Resting** (`0 1px 2px rgba(74,55,40,0.05)`): Default cards.
- **Raised** (`0 2px 8px rgba(74,55,40,0.08)`): Primary buttons.
- **Overlay** (`0 4px 12px` / `0 8px 24px`): Drawers, menus, cooking panel.

**The Soft Lift Rule.** Prefer `ring-1 ring-border` + `shadow-sm` over heavy multi-layer shadows.

## Shapes

Friendly geometry: default control radius `0.75rem` (`rounded-lg`), section cards `1rem` (`rounded-xl`), pills `9999px`.

**The Soft Corner Rule.** Sharp 0-radius UI is out of character.

## Components

### Buttons (`src/components/ui/button.tsx`)
- Min height 44px (`min-h-touch`) for default and icon; `sm` is also touch-height for iPhone safety.
- Width: content-sized unless `fullWidth`.
- Variants: primary, secondary, destructive, ghost, outline.

### Cards
- `default`: white + soft shadow + ring; **no default padding** (callers add `p-4`/`p-6`).
- `section`: `rounded-xl` + `p-6` for settings-style blocks.

### Inputs / FormField
- Inputs: white fill, linen border, 44px min height, lavender focus.
- Use `FormField` for label + control + error stacking.

### Badge
- Variants: default, active, accent, muted, success, destructive.
- Domain wrappers (e.g. menu `StatusBadge`) must compose `Badge`, not fork pill CSS.

### Alert
- Soft tinted banners for destructive / success / warning / info — replace ad-hoc `bg-destructive/10` copies.

### Navigation
- Fixed pastry-pink header with wordmark; drawer on small screens; safe-area aware.

### PageShell / EmptyState
- Required chrome for authenticated content pages.
- Empty lists use `EmptyState`, not ad-hoc gray text blocks.

## Do's and Don'ts

### Do
- Compose from `@/components/ui` and `@theme` tokens in `globals.css`.
- Keep 44×44 minimum touch targets for tappable controls.
- Pad fixed chrome with `env(safe-area-inset-*)`.
- Use page → card → nested surface hierarchy.
- Use Herb Success / Honey Warning / Sky Info tokens for status.

### Don't
- Introduce Inter/Roboto, purple SaaS gradients, or dark-mode-first skins.
- Use Tailwind `gray-*` or default `green-*` when semantic tokens exist.
- Nest cards inside cards for decoration.
- Ship hover-only affordances as the only way to act.
- Place controls under the notch or home indicator.
- Stretch destructive/secondary actions across wide cards.
- Treat scalloped/lace ornaments as required.
