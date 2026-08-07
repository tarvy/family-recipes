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
  border: "#E8E4DC"
  ring: "#AF93B3"
typography:
  display:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
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
  control-y: "0.5rem"
  control-x: "1rem"
  touch: "2.75rem"
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
    padding: "1rem"
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
---

# Design System: Family Recipes

## Overview

**Creative North Star: "Grandma's Cozy Kitchen Table"**

Family Recipes looks and feels like a warm kitchen table covered in a butter-gingham cloth — inviting, rounded, and soft-spoken. Soft pink leads brand and chrome; lavender marks selection and progress; yellow accents warmth without shouting. Cocoa brown carries all reading text. The system is deliberately domestic rather than “foodie lifestyle” or enterprise SaaS.

Density stays comfortable for thumbs: generous page padding, soft shadows tinted with cocoa, and pill-friendly radii. The gingham page background is atmosphere, not decoration piled on every card. Cards are clean white islands so recipes and lists stay readable under kitchen light.

**Key Characteristics:**
- Gingham tablecloth page field with white card surfaces
- Soft pink header chrome and primary CTAs
- Nunito everywhere — rounded, friendly, never clinical
- Cocoa-tinted shadows and borders (never cold gray UI chrome)
- iPhone-first layout with safe areas and 44px touch targets
- Three-layer surface stack: page → card → nested inset

## Colors

A warm domestic palette: pastry pink, butter yellow, soft lavender, gingham butter, and cocoa.

### Primary
- **Pastry Pink** (`#FED4D9`): Brand and primary actions — header bar, primary buttons, theme color. Use for “the family product” moments, not for every chip on screen.

### Secondary
- **Hearth Lavender** (`#AF93B3`): Selection, active filters, progress, focus ring. The quiet “this is selected” signal.

### Tertiary
- **Butter Yellow** (`#EFEBBA`): Accent warmth — highlights, category cues, update banners. Never the primary CTA fill.

### Neutral
- **Gingham Butter** (`#FBF6E3`): Page background base under the tablecloth pattern.
- **Fresh Cream** (`#FFFEF9`): Light highlight surfaces.
- **Cocoa** (`#4A3728`): All primary text and icon strokes.
- **Mushroom** (`#7A6B5C`): Secondary/muted text.
- **Linen Border** (`#E8E4DC`): Borders and input strokes.
- **Card White** (`#FFFFFF`) / **Nested Linen** (`#F9F8F4`): Content surfaces.

### Semantic
- **Berry Soft** (`#E57373`): Destructive / delete.
- **Herb Success** (`#5B8F6B`) + soft wash (`#E8F2EB`): Positive completion (timers done, OAuth connected, upload OK). Replaces ad-hoc Tailwind greens.

**The One Accent Voice Rule.** On any given screen, pink owns primary action; lavender owns selection state; yellow is garnish. Do not invent a fourth accent for “variety.”

**The No Cold Gray Rule.** Prefer cocoa/mushroom/linen tokens over Tailwind `gray-*` or blue SaaS links in product UI.

## Typography

**Display Font:** Nunito (with ui-sans-serif / system-ui fallback)
**Body Font:** Nunito
**Label/Mono Font:** Nunito for UI; monospace only for Cooklang syntax help snippets

**Character:** Softly rounded and neighborly — like handwritten recipe cards transcribed into a clean app, not a fashion magazine or a dashboard.

### Hierarchy
- **Display** (600, `text-3xl` / 1.875rem, tight): Page titles (“Recipes”, “Shopping List”).
- **Headline** (600, `text-xl` / 1.25rem): Section headers within a page.
- **Title** (600, `text-lg` / 1.125rem): Card titles, recipe names in dense lists.
- **Body** (400, `text-base` / 1rem, 1.5): Instructions, descriptions; keep measure comfortable on phone (~35–65ch when possible).
- **Label** (500, `text-sm` / 0.875rem): Form labels, meta chips, helper text. `text-xs` for dense badges only.

**The Single Family Rule.** Do not introduce Inter, Roboto, or a second display face. Nunito is the product voice.

## Layout

Mobile-first Operate mode. Page chrome uses `px-6 py-6` rhythm with section stacking at `space-y-6`. Content max widths: browse/menu `max-w-6xl`, detail/settings ~`max-w-3xl`–`max-w-5xl`, auth `max-w-md`. Header content height is 56px plus `safe-area-inset-top`. Mobile navigation is a left drawer below `md` (768px); desktop shows inline header links. There is no bottom tab bar.

**The Thumb-First Rule.** Primary actions and list interactions must work in a one-handed iPhone portrait grip. Prefer full-width taps over tiny corner icons. Fixed bottom chrome must clear `safe-area-inset-bottom`.

**The Safe Stage Rule.** With `viewport-fit=cover`, every fixed top/bottom surface pads Apple safe-area insets. Never place controls under the notch, Dynamic Island, or home indicator.

## Elevation & Depth

Hybrid: flat gingham field + softly lifted white cards. Shadows are cocoa-tinted and gentle — atmosphere, not Material “elevation theater.”

### Shadow Vocabulary
- **Resting card** (`0 1px 2px rgba(74, 55, 40, 0.05)`): Default cards.
- **Raised** (`0 2px 8px rgba(74, 55, 40, 0.08)`): Primary buttons, modest lift.
- **Overlay** (`0 4px 12px` / `0 8px 24px` cocoa alpha): Drawers, menus, cooking panel.

**The Soft Lift Rule.** Prefer `ring-1 ring-border` + `shadow-sm` over heavy multi-layer drop shadows or glow.

## Shapes

Friendly geometry: default control radius `0.75rem` (`rounded-lg`), larger section cards `1rem` (`rounded-xl`), pills `9999px`. Dashed pink decorative borders are reserved for rare ornamental moments — not default form chrome.

**The Soft Corner Rule.** Sharp 0-radius UI and hairline “broadsheet” layouts are out of character.

## Components

### Buttons
- **Shape:** Soft rectangle (`rounded-lg` / 0.75rem), minimum height 44px for default and icon sizes.
- **Primary:** Pastry pink fill, cocoa text, soft shadow.
- **Secondary:** Lavender fill, white text.
- **Outline / Ghost:** Transparent with linen border or pink-light hover wash.
- **Destructive:** Berry soft fill, white text — for confirmed destructive commits only.
- **Width:** Content-sized by default (`w-fit`). Opt in to full width only via `fullWidth`.
- **Focus:** Lavender ring (`:focus-visible`).

**The Content-Width Action Rule.** Buttons size to their label by default. Full-bleed (`fullWidth`) is reserved for primary submits in *narrow* stacks — auth forms, empty-state CTAs, single-column mobile composers. Never stretch destructive or secondary actions across a wide settings/list card; a “Revoke” / “Delete” control in a row stays compact (prefer outline/ghost + destructive color), aligned with the content, not a salmon bar across the card.

### Chips / Badges
- **Style:** Pill radius; pink-light default; lavender fill when active/selected.
- **Use:** Category filters, meta tags, status — not as a substitute for primary buttons.

### Cards / Containers
- **Corner Style:** `rounded-lg` default; `rounded-xl` for section cards.
- **Background:** White card on gingham; nested linen for inset groups (ingredients, form blocks).
- **Shadow Strategy:** `shadow-sm` + `ring-1 ring-border`.
- **Internal Padding:** Comfortable (`p-4`–`p-6`); avoid cramped kitchen-unreadable stacks.

### Inputs / Fields
- **Style:** White fill, linen border, `rounded-lg`, 44px min height.
- **Focus:** Lavender border + ring.
- **Error / Disabled:** Destructive text/border for errors; reduced opacity when disabled.

### Navigation
- Fixed pastry-pink header with text wordmark “Family Recipes.”
- Mobile: hamburger → left drawer (280px) + edge-swipe open.
- Desktop (`md+`): inline links.
- Header may collapse on scroll down; expand on scroll up — never cover safe areas incorrectly.

### Signature: Recipe surfaces
Recipe cards use category-tinted headers and letter placeholders; detail view is a white sheet with nested ingredient panels. Cooking session uses a fixed bottom panel that must respect the home indicator.

## Do's and Don'ts

### Do:
- **Do** compose new screens from `src/components/ui` primitives and `@theme` tokens in `globals.css`.
- **Do** keep 44×44 minimum touch targets for tappable controls.
- **Do** pad fixed chrome with `env(safe-area-inset-*)` on iPhone.
- **Do** use the page → card → nested surface hierarchy.
- **Do** use Herb Success tokens for positive completion states.

### Don't:
- **Don't** introduce purple-on-white SaaS gradients, Inter/Roboto defaults, or dark-mode-first skins.
- **Don't** use Tailwind `gray-*` or default `green-*` when semantic tokens exist.
- **Don't** nest cards inside cards for decoration.
- **Don't** ship hover-only affordances as the only way to act.
- **Don't** place controls under the iOS home indicator or status bar.
- **Don't** stretch destructive or secondary actions to the full width of a wide card.
- **Don't** treat scalloped/lace ornaments as required — they are optional future garnish, not the system.
