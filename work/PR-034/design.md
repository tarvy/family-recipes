# PR-034: Recipe Detail Width-Based Responsive Layout - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-04
> **Author**: Claude Code

---

## Overview

Modify the recipe detail page's responsive layout to trigger two-column mode **only for mobile landscape** (orientation + width constraints). Desktop remains single-column for better readability, while mobile landscape enables side-by-side ingredients and instructions for cooking mode.

---

## Architecture

### Current State (PR-033)

```
TRIGGER: orientation:landscape AND min-height:480px

┌─────────────────────────────────────────────────────┐
│  Only activates when device is physically rotated   │
│  Desktop browsers → always single column            │
│  Tablets in portrait → single column                │
└─────────────────────────────────────────────────────┘
```

### Target State (PR-034)

```
TRIGGER: orientation:landscape AND min-width:640px AND max-width:1024px

┌─────────────────────────────────────────────────────┐
│  Activates on:                                      │
│  - Phone landscape (640px-1024px in landscape)      │
│  - Small tablet landscape                           │
│                                                     │
│  Single-column on:                                  │
│  - Desktop (>1024px) - cleaner reading experience   │
│  - Phone portrait - standard mobile view            │
└─────────────────────────────────────────────────────┘
```

### Layout Breakpoints

| Viewport | Layout | Trigger | Example Devices |
|----------|--------|---------|-----------------|
| < 768px portrait | Single column | Default | iPhone 13 Mini portrait (375px) |
| < 768px landscape | Single column | Width too narrow | iPhone SE landscape (667px) |
| >= 768px | Two column | `md:` breakpoint | iPhone 13 Mini landscape (812px), iPad Mini portrait |
| >= 1024px | Two column (wider) | `lg:` breakpoint | iPad landscape, small laptops |
| >= 1280px | Two column (max-width) | `xl:` breakpoint | Desktop monitors |

### Key Device: iPhone 13 Mini Landscape

**Viewport**: 812 x 375 (CSS pixels)

This is the baseline test device because:
- Width (812px) just exceeds the `md:` breakpoint (768px)
- Height (375px) is below PR-033's min-height threshold (480px)
- If the layout works here, it works everywhere larger

**Current behavior (broken)**:
- PR-033 triggers on `orientation:landscape AND min-height:480px`
- iPhone 13 Mini landscape has height 375px < 480px
- Result: Single-column layout with wasted horizontal space

**Target behavior (PR-034)**:
- Trigger on `min-width:768px` via Tailwind's `md:` breakpoint
- iPhone 13 Mini landscape has width 812px >= 768px
- Result: Two-column layout, ingredients sticky on left

### Visual Layout

```
NARROW (< 768px portrait)
┌─────────────────────────────────────┐
│            Header                   │
├─────────────────────────────────────┤
│          Ingredients                │
│        (with multiplier)            │
├─────────────────────────────────────┤
│           Equipment                 │
├─────────────────────────────────────┤
│          Instructions               │
│          (scrollable)               │
└─────────────────────────────────────┘

MEDIUM+ (>= 768px) OR LANDSCAPE
┌─────────────────────────────────────────────────────────┐
│                        Header                           │
├─────────────────────┬───────────────────────────────────┤
│    Ingredients      │           Instructions            │
│  (with multiplier)  │           (scrollable)            │
│                     │                                   │
│    Equipment        │                                   │
│    [sticky]         │                                   │
└─────────────────────┴───────────────────────────────────┘
```

---

## Component Changes

### RecipeContentLayout

The main change is in `recipe-content-layout.tsx`. Replace orientation-only media queries with standard Tailwind breakpoints plus orientation fallback.

**Current CSS Classes:**
```tsx
// Only triggers on landscape orientation
className={`
  flex flex-col gap-10
  [@media(orientation:landscape)_and_(min-height:480px)]:grid
  [@media(orientation:landscape)_and_(min-height:480px)]:grid-cols-[...]
  ...
`}
```

**New CSS Classes:**
```tsx
// Triggers on md: breakpoint (768px+) - width-based only
className={`
  flex flex-col gap-10
  md:grid md:grid-cols-[minmax(260px,1fr)_minmax(300px,2fr)] md:gap-6
  lg:grid-cols-[minmax(280px,1fr)_minmax(360px,2fr)]
  xl:grid-cols-[300px_1fr]
`}
```

**Key Changes:**
1. Add `md:grid` to trigger at 768px width (covers iPhone 13 Mini landscape at 812px)
2. Add `lg:` variant for better proportions on larger screens
3. **Remove orientation-based query** - width-based breakpoints handle all cases
4. Tighter column minimums for smaller landscape phones (260px left, 300px right)

**Why Remove Orientation Query:**
- The `md:` breakpoint at 768px covers iPhone 13 Mini landscape (812px) and all larger devices
- Devices with landscape width < 768px (e.g., iPhone SE at 667px) are too narrow for two columns anyway
- Simpler CSS, fewer edge cases, more predictable behavior

### Column Proportions

| Breakpoint | Left (Ingredients) | Right (Instructions) | Rationale |
|------------|-------------------|---------------------|-----------|
| md (768px+) | minmax(260px, 1fr) | minmax(300px, 2fr) | Fits iPhone 13 Mini landscape (812px) |
| lg (1024px+) | minmax(280px, 1fr) | minmax(360px, 2fr) | More breathing room on tablets |
| xl (1280px+) | 300px fixed | 1fr | Consistent left panel on desktop |

**Note**: No landscape-specific breakpoint needed. Width-based triggers handle all cases:
- iPhone 13 Mini landscape (812px) → triggers `md:`
- iPhone SE landscape (667px) → stays single-column (too narrow for comfortable two-col)

### Sticky Positioning

The left panel (ingredients) should be sticky in two-column mode so it remains visible while scrolling instructions.

```tsx
<div className={`
  md:sticky md:top-4 md:self-start
  md:max-h-[calc(100vh-120px)] md:overflow-y-auto
`}>
  {ingredientPanel}
</div>
```

**Behavior:**
- At `md:` breakpoint and above, ingredients panel sticks to top
- `top-4` provides breathing room below header
- `max-h-[calc(100vh-120px)]` allows panel to scroll if ingredients overflow
- Instructions panel scrolls naturally; ingredients stay in view

---

## File Changes

### Modified Files

| File | Change |
|------|--------|
| `src/components/recipes/recipe-content-layout.tsx` | Add width-based breakpoints, sticky positioning |
| `src/app/(main)/recipes/[slug]/page.tsx` | Possibly adjust Card max-width for wide screens |

### No New Files

This PR modifies existing components only. No new files needed.

---

## CSS Strategy

### Tailwind v4 Approach

This project uses Tailwind CSS v4 (CSS-first configuration). Standard responsive prefixes (`md:`, `lg:`, `xl:`) work out of the box.

For the orientation fallback on narrow viewports, continue using arbitrary variants:
```tsx
[@media(orientation:landscape)_and_(min-height:480px)_and_(max-width:767px)]
```

### Combined Query

The layout triggers when EITHER condition is true:
- **Width-based**: `md:` (viewport >= 768px)
- **Orientation-based**: landscape AND height >= 480px AND width < 768px

This ensures:
- Desktop always gets two-column
- Tablet always gets two-column
- Phone in landscape gets two-column
- Phone in portrait stays single-column

---

## Page Container Adjustments

Current page uses `max-w-3xl` (768px) which conflicts with two-column intent on wider screens.

**Option A**: Increase max-width for recipe detail
```tsx
// In page.tsx
<Card className="mx-auto w-full max-w-5xl ...">
```

**Option B**: Remove max-width, let content breathe
```tsx
// In page.tsx
<Card className="mx-auto w-full max-w-none lg:max-w-6xl ...">
```

**Recommendation**: Option A with `max-w-5xl` (1024px) to balance reading comfort with space utilization.

---

## Scroll Behavior

### Two-Column Mode

- **Left panel**: `overflow-y-auto` with `max-h-[calc(100vh-200px)]` for independent scroll if ingredients overflow
- **Right panel**: `overflow-y-auto` with same max-height
- **Container**: Remove `max-h-[70vh]` in favor of natural height with sticky left panel

### Single-Column Mode

- Normal document flow
- No special scroll handling

---

## Transition Animation

Add smooth transition when resizing browser:

```css
.recipe-content-layout {
  transition: grid-template-columns 200ms ease-out;
}
```

In Tailwind:
```tsx
className="transition-[grid-template-columns] duration-200 ease-out"
```

---

## Accessibility

- Maintain focus order: ingredients then instructions
- Sticky panel should not trap focus
- Screen readers should announce layout changes (no action needed, natural DOM order)

---

## Security Considerations

- [x] No new user input handling
- [x] No API changes
- [x] CSS-only changes, no security impact

---

## Observability

No new logging needed. This is purely a CSS/layout change.

---

## Dependencies

No new packages required.

---

## Alternatives Considered

### Option A: CSS Container Queries

- **Pros**: More precise, based on container width not viewport
- **Cons**: Slightly less browser support, more complex setup
- **Why rejected**: Standard breakpoints sufficient for this use case

### Option B: JavaScript-Based Layout Switching

- **Pros**: More control, can detect exact conditions
- **Cons**: Flash of wrong layout, more complex, hydration issues
- **Why rejected**: CSS media queries handle this cleanly

### Option C: Keep Orientation-Only (Status Quo)

- **Pros**: Already works
- **Cons**: Desktop users never get two-column layout
- **Why rejected**: Misses the primary use case of cooking from laptop/desktop

---

## Open Design Questions

- [ ] Should the Card max-width increase only in two-column mode, or always?
- [ ] Does the header need adjustment for very wide screens?
- [ ] Should equipment section have its own sticky behavior separate from ingredients?
