# PR-025: Simplified Cooklang-First Recipe Edit Flow - Technical Design

> **Status**: Approved
> **Last Updated**: 2026-01-29
> **Author**: Claude Code Agent

---

## Overview

Replace the current structured form-based recipe editing with a Cooklang-first approach. Users edit raw Cooklang text directly with syntax assistance, live preview, and minimal metadata fields. This preserves exact Cooklang formatting and teaches proper syntax.

---

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT FLOW (REMOVE)                    │
│                                                             │
│  .cook file → parser → RecipeDetail → RecipeForm → API     │
│                                        (structured)         │
│                        ↓                                    │
│  API → buildRecipe → serializer → .cook file               │
│        (IRecipe)      (regex reconstruction - lossy!)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      NEW FLOW                               │
│                                                             │
│  .cook file → getRawCooklangContent → CooklangEditor       │
│               (raw string)            (preserves exact)     │
│                        ↓                                    │
│  CooklangEditor → API → write directly → .cook file        │
│  (raw string)           (no reconstruction needed)          │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

```
RecipeEditorPage
├── MetadataBar (minimal form fields)
│   ├── TitleInput
│   ├── CategorySelect
│   ├── ServingsInput
│   ├── PrepTimeInput
│   └── CookTimeInput
│
├── EditorPreviewSplit (responsive split view)
│   ├── CooklangEditor (left)
│   │   ├── Textarea with monospace font
│   │   ├── SyntaxHelpBar (collapsible)
│   │   └── InsertButtons (@, #, ~)
│   │
│   └── CooklangPreview (right)
│       ├── RenderedSteps
│       └── ExtractedIngredientsList
│
└── IngredientPopover (modal for insertion)
    ├── NameInput
    ├── QuantityInput
    ├── UnitInput
    └── InsertButton
```

### Data Flow

```
EDIT FLOW:
1. EditRecipePage loads raw .cook content via getRawCooklangContent(slug)
2. Extract metadata from content (parse >> lines client-side)
3. Display in CooklangEditor with MetadataBar pre-filled
4. User edits content and/or metadata
5. On save: merge metadata + body → single Cooklang string
6. PUT /api/recipes/[slug] with { content: string, category: string }
7. Server parses to validate, extracts slug from title
8. Write raw content to .cook file (no reconstruction!)

CREATE FLOW:
1. NewRecipePage shows empty editor with templates
2. User fills metadata + writes Cooklang body
3. On save: build content from metadata + body
4. POST /api/recipes with { content: string, category: string }
5. Server parses to validate and extract slug
6. Write to new .cook file
```

---

## API Design

### Endpoints

#### `POST /api/recipes` (Modified)

**Purpose**: Create a new recipe from raw Cooklang content

**Request**:
```typescript
interface CreateRecipeRequest {
  /** Raw Cooklang content including metadata */
  content: string;
  /** Target category directory */
  category: string;
}
```

**Response**:
```typescript
interface CreateRecipeResponse {
  success: true;
  slug: string;
}
```

**Validation**:
- Content must parse as valid Cooklang
- Must have `>> title:` metadata
- Must have at least one step (non-metadata line)
- Category must be valid

**Errors**:
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_COOKLANG | Content doesn't parse |
| 400 | MISSING_TITLE | No title metadata found |
| 400 | INVALID_CATEGORY | Category not in allowed list |
| 409 | CONFLICT | Recipe with same slug exists |

#### `PUT /api/recipes/[slug]` (Modified)

**Purpose**: Update a recipe with raw Cooklang content

**Request**:
```typescript
interface UpdateRecipeRequest {
  /** Raw Cooklang content including metadata */
  content: string;
  /** Target category directory */
  category: string;
}
```

**Response**:
```typescript
interface UpdateRecipeResponse {
  success: true;
  slug: string;  // May differ if title changed
}
```

---

## UI Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CooklangEditor` | `src/components/recipes/cooklang-editor.tsx` | Main textarea editor with insert buttons |
| `CooklangPreview` | `src/components/recipes/cooklang-preview.tsx` | Live rendered preview |
| `IngredientPopover` | `src/components/recipes/ingredient-popover.tsx` | Helper for inserting @ingredient{} |
| `SyntaxHelp` | `src/components/recipes/syntax-help.tsx` | Collapsible syntax reference |
| `MetadataBar` | `src/components/recipes/metadata-bar.tsx` | Minimal metadata form fields |

### Component Hierarchy

```
EditRecipePage / NewRecipePage
└── MainLayout
    └── RecipeEditorForm (new, replaces RecipeForm)
        ├── MetadataBar
        │   ├── Input (title)
        │   ├── Select (category)
        │   └── Input x3 (servings, prep, cook)
        ├── div.editor-preview-split
        │   ├── CooklangEditor
        │   │   ├── SyntaxHelp
        │   │   ├── div.insert-buttons
        │   │   │   └── Button x3 (@, #, ~)
        │   │   └── textarea
        │   └── CooklangPreview
        │       ├── div.rendered-steps
        │       └── div.ingredients-sidebar
        ├── IngredientPopover (conditionally rendered)
        └── div.submit-bar
            └── Button (Save)
```

### State Management

```typescript
interface EditorState {
  // Metadata (synced with >> lines)
  title: string;
  category: string;
  servings: string;
  prepTime: string;
  cookTime: string;

  // Editor content (body only, excludes metadata)
  body: string;

  // UI state
  showIngredientPopover: boolean;
  cursorPosition: number;
  parseError: string | null;

  // Derived (from parsing body)
  parsedIngredients: IIngredient[];
  parsedSteps: IStep[];
}
```

State flow:
- Metadata changes → rebuild full content for save
- Body changes → re-parse for preview
- Insert helper → modify body at cursor position

---

## File Structure

```
src/
├── app/
│   ├── (main)/recipes/
│   │   ├── [slug]/edit/page.tsx    # MODIFY - use new editor
│   │   └── new/page.tsx            # MODIFY - use new editor
│   └── api/recipes/
│       ├── route.ts                # MODIFY - accept raw content
│       └── [slug]/route.ts         # MODIFY - accept raw content
├── components/recipes/
│   ├── cooklang-editor.tsx         # NEW - main editor component
│   ├── cooklang-preview.tsx        # NEW - live preview
│   ├── ingredient-popover.tsx      # NEW - insert helper
│   ├── syntax-help.tsx             # NEW - syntax reference
│   ├── metadata-bar.tsx            # NEW - minimal metadata form
│   ├── recipe-form.tsx             # DEPRECATE (keep temporarily)
│   ├── ingredient-input.tsx        # DEPRECATE
│   └── step-input.tsx              # DEPRECATE
├── lib/
│   ├── cooklang/
│   │   ├── parser.ts               # KEEP - used for validation/preview
│   │   ├── serializer.ts           # DEPRECATE (no longer needed!)
│   │   └── metadata.ts             # NEW - extract/inject metadata
│   └── recipes/
│       ├── loader.ts               # MODIFY - add getRawContent
│       └── writer.ts               # MODIFY - add writeRawContent
```

---

## Dependencies

### New Packages

None required. Using native textarea for editing.

### Internal Dependencies

- Uses existing `parseCooklang()` for validation and preview
- Uses existing file scanner for locating recipes
- Deprecates `serializeToCooklang()` - no longer needed

---

## Security Considerations

- [x] Input validation: Cooklang content parsed to verify structure
- [x] Authentication required for create/update endpoints (existing)
- [x] Category validation prevents directory traversal
- [x] No sensitive data in logs (existing)
- [x] XSS: Cooklang content rendered as text, not HTML

---

## Testing Strategy

### Unit Tests

| Module | Test Focus |
|--------|------------|
| `metadata.ts` | Extract metadata from content, inject metadata |
| `cooklang-editor.tsx` | Cursor position tracking, insert at position |
| `cooklang-preview.tsx` | Renders parsed ingredients/steps correctly |

### Integration Tests

| Flow | Test Focus |
|------|------------|
| Create recipe | Raw content → API → file created with exact content |
| Edit recipe | Load → modify → save → content preserved exactly |
| Validation | Invalid Cooklang rejected with helpful error |

### Manual Verification

| Check | Expected |
|-------|----------|
| Edit existing recipe | Raw content loads, preview renders |
| Insert ingredient | Popover opens, inserts at cursor |
| Save preserves content | Reload shows exact same content |
| Mobile responsive | Editor usable on 375px width |

---

## Alternatives Considered

### Option A: WYSIWYG Editor
- **Pros**: No syntax learning required
- **Cons**: Complex to build, abstracts away Cooklang, harder to maintain
- **Why rejected**: Defeats purpose of Cooklang (human-readable text files)

### Option B: Hybrid Form + Raw Toggle (Selected for MVP)
- **Pros**: Gradual transition, familiar form UX available
- **Cons**: Two code paths to maintain
- **Why rejected**: Adds complexity, delays clean implementation

### Option C: Pure Cooklang Editor (Selected)
- **Pros**: Simple, teaches Cooklang, preserves content exactly
- **Cons**: Users must learn basic syntax
- **Why selected**: Aligns with Cooklang philosophy, simpler codebase

---

## Rollout Plan

1. [x] Implement new components behind existing routes
2. [ ] Test with existing recipes (edit round-trip)
3. [ ] Test with new recipes (create flow)
4. [ ] Remove old form components after verification
5. [ ] Monitor for user feedback

---

## Open Design Questions

- [x] Keep old form as fallback? **Decision: No, clean break**
- [x] Syntax highlighting in editor? **Decision: No for MVP, plain textarea**
- [x] Auto-save drafts? **Decision: No for MVP**
