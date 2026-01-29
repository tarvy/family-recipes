# PR-025: Simplified Cooklang-First Recipe Edit Flow - Requirements

> **Status**: Approved
> **PR Branch**: `claude/simplify-recipe-edit-flow-rViYR`
> **Dependencies**: None

---

## Problem Statement

The current recipe edit flow violates Cooklang's core design philosophy. It separates ingredients into a dedicated list, then attempts "best-effort reconstruction" using regex replacement to inline them back into steps during serialization. This approach:

1. **Breaks Cooklang semantics** - Ingredients should live *within* instructions, not separate
2. **Loses context** - The connection between ingredient and where it's used is broken
3. **Creates fragile round-trips** - Parse → Form → Regex reconstruction loses information
4. **Doesn't educate users** - Users never learn Cooklang, reducing recipe portability

Cooklang's explicit design goal is that "ingredients are embedded directly within plain-English cooking instructions...keeping ingredients contextually linked to their preparation steps."

---

## User Stories

### Story 1: Recipe Author Writes a New Recipe

**As a** family recipe contributor
**I want** to write recipes in natural Cooklang format
**So that** my recipes are portable, well-structured, and contextually clear

#### Acceptance Criteria

```gherkin
Feature: Cooklang-First Recipe Creation

  Scenario: Writing a recipe with inline ingredients
    Given I am on the new recipe page
    When I type "Add @flour{2%cups} to the @bowl{}"
    Then I see the text rendered with syntax highlighting
    And I see a preview showing "Add 2 cups flour to the bowl"
    And I see an extracted ingredients list showing "flour - 2 cups"

  Scenario: Using the ingredient insertion helper
    Given I am editing the recipe body
    And my cursor is positioned in the text
    When I click the "Insert Ingredient" button
    And I enter name "butter", quantity "1", unit "tbsp"
    And I click "Insert"
    Then "@butter{1%tbsp}" is inserted at the cursor position

  Scenario: Saving a recipe preserves exact Cooklang
    Given I have written a recipe in Cooklang format
    When I save the recipe
    And I later edit the same recipe
    Then the Cooklang text is exactly as I wrote it
    And no information has been lost or reformatted

  Scenario: Minimal metadata collection
    Given I am creating a new recipe
    Then I see only essential metadata fields:
      | Field      | Required |
      | Title      | Yes      |
      | Category   | Yes      |
      | Servings   | No       |
      | Prep Time  | No       |
      | Cook Time  | No       |
    And the majority of the screen is the Cooklang editor
```

### Story 2: Recipe Author Edits an Existing Recipe

**As a** family member editing grandma's recipe
**I want** to see and modify the original Cooklang text
**So that** I don't accidentally corrupt the recipe structure

#### Acceptance Criteria

```gherkin
Feature: Cooklang Recipe Editing

  Scenario: Loading an existing recipe for editing
    Given the recipe "Lemon Pasta" exists with Cooklang content
    When I navigate to the edit page for "Lemon Pasta"
    Then I see the raw Cooklang content in the editor
    And the metadata fields are populated from the >> headers
    And the preview shows the rendered recipe

  Scenario: Modifying ingredient quantities
    Given I am editing a recipe with "@butter{1%cup}"
    When I change it to "@butter{2%cups}"
    Then the preview updates to show "2 cups butter"
    And the extracted ingredients list updates accordingly

  Scenario: Adding a new step with ingredients
    Given I am editing an existing recipe
    When I add a new line "Fold in @chocolate chips{1%cup} gently."
    Then the preview shows the new step
    And "chocolate chips - 1 cup" appears in the ingredients list
```

### Story 3: Recipe Author Learns Cooklang Syntax

**As a** user unfamiliar with Cooklang
**I want** contextual help and syntax hints
**So that** I can write well-formed recipes without memorizing syntax

#### Acceptance Criteria

```gherkin
Feature: Cooklang Syntax Education

  Scenario: Viewing syntax help
    Given I am on the recipe editor page
    Then I see a collapsible syntax reference panel
    And it shows examples:
      | Syntax               | Purpose                    |
      | @ingredient{qty%unit}| Ingredient with quantity   |
      | @ingredient{}        | Ingredient (no quantity)   |
      | #cookware{}          | Cookware/equipment         |
      | ~{time%unit}         | Timer                      |
      | >> key: value        | Metadata                   |

  Scenario: Quick insert buttons
    Given I am in the recipe editor
    Then I see quick insert buttons for @ # and ~
    When I click the @ button
    Then a popover opens to help me format an ingredient
```

---

## Out of Scope

- **Rich text editing** - Users write plain Cooklang, not WYSIWYG
- **Automatic Cooklang conversion** - No "paste recipe and auto-markup" feature (future PR)
- **Shopping list generation** - Existing functionality unchanged
- **Recipe import from URL** - Separate feature
- **Multi-language support** - English only for now

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Edit round-trip fidelity | 100% | Save → Load preserves exact content |
| Form field count | Reduced by 50% | Count visible form inputs |
| Cooklang validity | 100% | All saved recipes parse without error |
| Page load time | < 500ms | Lighthouse performance audit |

---

## Open Questions

- [x] Should we keep the old form available as a fallback? **Decision: No, clean break**
- [x] How to handle existing recipes with reconstructed Cooklang? **Decision: Load as-is, they're valid**

---

## References

- [Cooklang Specification](https://cooklang.org/docs/spec/)
- [Cooklang Philosophy](https://cooklang.org/docs/)
- Current implementation: `src/components/recipes/recipe-form.tsx`
- Cooklang parser: `src/lib/cooklang/parser.ts`
