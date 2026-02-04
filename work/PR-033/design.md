# PR-033: Recipe Detail Responsive Layout - Technical Design

> **Status**: Draft
> **Last Updated**: 2026-02-03
> **Author**: Claude Code

---

## Overview

Implement a responsive two-column layout for the recipe detail page that activates in landscape orientation on mobile/tablet devices. Add interactive ingredient references within step text that show full measurements on tap.

> **Plan Agent Validation**: 2026-02-03 - Identified critical blockers addressed below.

---

## Architecture

### Layout Strategy

```
PORTRAIT (< 768px OR portrait orientation)
┌─────────────────────────────────┐
│          Header/Meta            │
├─────────────────────────────────┤
│         Ingredients             │
│      (with multiplier)          │
├─────────────────────────────────┤
│          Equipment              │
├─────────────────────────────────┤
│         Instructions            │
│         (scrollable)            │
└─────────────────────────────────┘

LANDSCAPE (>= 480px height AND landscape orientation)
┌─────────────────────────────────────────────────────┐
│                    Header/Meta                       │
├────────────────────────┬────────────────────────────┤
│     Ingredients        │       Instructions          │
│   (with multiplier)    │       (scrollable)          │
│                        │                             │
│     Equipment          │                             │
│   (sticky/scrollable)  │                             │
└────────────────────────┴────────────────────────────┘
```

### Critical Prerequisite: Step Ingredients Data

**BLOCKER**: The current `RecipeDetail` interface in `src/lib/recipes/loader.ts` strips `ingredients` from steps:

```typescript
// Current (broken for this feature)
steps: Array<{
  text: string;
  timers?: Array<{ duration: number; unit: string }>;
}>;

// Required (add ingredients)
steps: Array<{
  text: string;
  timers?: Array<{ duration: number; unit: string }>;
  ingredients?: Array<{ name: string; quantity?: string; unit?: string }>;
}>;
```

The `convertStepsForDetail()` function must be updated to preserve `ingredients` from each step.

### Detection Approach

**Tailwind v4**: This project uses Tailwind CSS v4 with CSS-first configuration. No `tailwind.config.ts` exists.

Use arbitrary variants or add custom variant to `globals.css`:

```css
/* Option 1: Add to @theme in globals.css (if Tailwind v4 supports) */
/* Option 2: Use arbitrary variants inline */
```

Inline arbitrary variant approach (preferred for v4):
```tsx
className="[@media(orientation:landscape)_and_(min-height:480px)]:grid"
```

### Component Hierarchy

```
RecipeDetailPage (server component)
└── RecipeDetailClient (client component - NEW)
    ├── RecipeHeader
    │   └── (title, meta, tags - collapsed in landscape)
    ├── RecipeContentLayout (NEW)
    │   ├── IngredientPanel (left column)
    │   │   ├── ScalableIngredientList (existing, enhanced)
    │   │   └── EquipmentList
    │   └── InstructionsPanel (right column)
    │       └── InteractiveStepList (NEW, replaces StepList)
    │           └── IngredientTooltip (NEW)
    └── RecipeFooter
```

---

## Component Design

### 1. RecipeDetailClient

New client component wrapper to manage shared state across ingredients and steps.

```typescript
interface RecipeDetailClientProps {
  recipe: RecipeDetail;
}

// Manages:
// - Servings multiplier (lifted from ScalableIngredientList)
// - Active ingredient tooltip state
// - Orientation detection (for JS-dependent features)
```

### 2. RecipeContentLayout

Handles the responsive grid layout switching.

```typescript
interface RecipeContentLayoutProps {
  ingredientPanel: React.ReactNode;
  instructionsPanel: React.ReactNode;
}
```

CSS approach using Tailwind:
```tsx
<div className="
  flex flex-col gap-8
  landscape:md:grid landscape:md:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)] landscape:md:gap-6
">
  {/* Left: Ingredients */}
  <div className="landscape:md:sticky landscape:md:top-0 landscape:md:max-h-screen landscape:md:overflow-y-auto">
    {ingredientPanel}
  </div>

  {/* Right: Instructions */}
  <div className="landscape:md:overflow-y-auto landscape:md:max-h-screen">
    {instructionsPanel}
  </div>
</div>
```

### 3. InteractiveStepList

Enhanced step list with tappable ingredients.

```typescript
interface InteractiveStepListProps {
  steps: IStep[];
  ingredients: IIngredient[];  // Full ingredient list for lookup
  multiplier: number;          // For scaled quantities
  onIngredientTap?: (ingredient: IIngredient) => void;
}
```

**Ingredient Matching Strategy:**

The Cooklang parser already extracts `ingredients` per step. We can:
1. Use the step's embedded ingredients array
2. Match ingredient names in step text using regex
3. Wrap matches in interactive spans

```typescript
function parseStepWithIngredients(
  stepText: string,
  stepIngredients: IIngredient[]
): React.ReactNode {
  // Build regex from ingredient names
  const ingredientNames = stepIngredients.map(i => escapeRegex(i.name));
  const pattern = new RegExp(`\\b(${ingredientNames.join('|')})\\b`, 'gi');

  // Split and wrap matches
  const parts = stepText.split(pattern);
  return parts.map((part, i) => {
    const ingredient = stepIngredients.find(
      ing => ing.name.toLowerCase() === part.toLowerCase()
    );
    if (ingredient) {
      return <IngredientTrigger key={i} ingredient={ingredient} />;
    }
    return part;
  });
}
```

### 4. IngredientTooltip

Popover showing full ingredient measurement.

```typescript
interface IngredientTooltipProps {
  ingredient: IIngredient;
  multiplier: number;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}
```

**Implementation options:**

| Option | Pros | Cons |
|--------|------|------|
| CSS-only tooltip | Simple, no JS | Can't adapt position, harder to dismiss |
| Radix Popover | Accessible, positioned | Adds dependency |
| Custom portal | Full control | More code to maintain |

**Recommendation:** Start with a simple CSS tooltip (`:focus-within` based), upgrade to Radix if needed.

```tsx
// Simple implementation
<button
  className="
    relative underline decoration-dotted decoration-pink
    focus:outline-none focus-within:outline-none
  "
  onClick={() => setActiveIngredient(ingredient)}
>
  {ingredient.name}
  {isActive && (
    <span className="
      absolute bottom-full left-1/2 -translate-x-1/2 mb-2
      px-3 py-2 rounded-lg bg-card shadow-lg border border-border
      text-sm whitespace-nowrap z-50
    ">
      {formatIngredient(ingredient, multiplier)}
    </span>
  )}
</button>
```

---

## State Management

State is lifted to `RecipeDetailClient`:

```typescript
const [multiplier, setMultiplier] = useState(1);
const [activeIngredient, setActiveIngredient] = useState<IIngredient | null>(null);

// Close tooltip on outside click
useEffect(() => {
  if (!activeIngredient) return;

  const handleClick = (e: MouseEvent) => {
    if (!(e.target as Element).closest('[data-ingredient-tooltip]')) {
      setActiveIngredient(null);
    }
  };

  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}, [activeIngredient]);
```

---

## File Structure

```
src/
├── app/(main)/recipes/[slug]/
│   └── page.tsx                      # Modified - wrap in client component
├── lib/recipes/
│   └── loader.ts                     # Modified - add ingredients to RecipeDetail.steps
├── components/recipes/
│   ├── recipe-detail-client.tsx      # NEW - client wrapper
│   ├── recipe-content-layout.tsx     # NEW - responsive grid
│   ├── interactive-step-list.tsx     # NEW - replaces step-list usage
│   ├── ingredient-tooltip.tsx        # NEW - popover component
│   ├── scalable-ingredient-list.tsx  # Modified - accept external multiplier
│   └── step-list.tsx                 # Unchanged (fallback)
```

**Note**: No `tailwind.config.ts` modifications needed - using Tailwind v4 CSS-first approach.

---

## CSS/Styling

### Tailwind Custom Variant

Add landscape variant for cleaner classes:

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      screens: {
        'landscape': { raw: '(orientation: landscape) and (min-height: 480px)' },
      },
    },
  },
}
```

### Key Styles

```css
/* Sticky left panel in landscape */
.ingredient-panel-landscape {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding-right: 1rem;
  border-right: 1px solid var(--border);
}

/* Smooth orientation transition */
.recipe-content-layout {
  transition: grid-template-columns 0.2s ease-out;
}

/* Ingredient highlight in steps */
.ingredient-trigger {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: var(--pink);
  text-underline-offset: 2px;
  cursor: pointer;
}
```

---

## Dependencies

### New Packages

None required. Can use native CSS and React state.

### Optional (if tooltip needs enhancement)

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-popover` | ^1.0 | Accessible popover positioning |

---

## Security Considerations

- [x] No user input being rendered as HTML
- [x] Ingredient names are sanitized by Cooklang parser
- [x] No external data fetching in tooltips

---

## Observability

### Logging

| Event | Level | Data |
|-------|-------|------|
| Orientation change | debug | `{ orientation, viewport }` |
| Ingredient tap | debug | `{ ingredientName, stepIndex }` |

---

## Alternatives Considered

### Option A: Media Query Only (No JS)

- **Pros**: Simpler, works without JS
- **Cons**: Can't coordinate multiplier state across panels, can't do interactive tooltips
- **Why rejected**: Interactive ingredients require JS state

### Option B: Full Cook Mode (Selected for Future)

- **Pros**: Better hands-free experience with step-by-step progression
- **Cons**: Larger scope, needs timers, voice control
- **Why deferred**: Can build on this foundation later

### Option C: Bottom Sheet for Ingredients (Mobile)

- **Pros**: Familiar mobile pattern
- **Cons**: Still requires tap to open, obscures content
- **Why rejected**: Two-column landscape is better for "always visible"

---

## Open Design Questions

- [ ] Should header collapse to a single line in landscape?
- [ ] Include equipment in left panel or keep separate?
- [ ] Maximum column widths for very wide tablets?
