# PR-065: Lo Mein Framework Recipe - Requirements

> **Status**: Approved
> **PR Branch**: `cursor/add-lo-mein-recipe-11ef`
> **Dependencies**: PR-010 (Recipe Migration)

## Problem Statement

The cookbook does not yet contain the adaptable lo mein framework presented in
Ethan Chlebowski's video. A recipe should capture the method and ratio-based
sauce so the cook can use available noodles, protein, vegetables, and
aromatics instead of following one rigid variation.

## User Story

**As a** home cook
**I want** a Cooklang recipe for the lo mein framework
**So that** I can make a balanced noodle stir-fry from whatever ingredients I
have available.

### Acceptance Criteria

```gherkin
Feature: Lo mein framework recipe

  Scenario: Recipe is available in the entree collection
    Given the cookbook is synced from the recipes directory
    When I browse entree recipes
    Then I can find a recipe titled "Lo Mein Framework"
    And the recipe cites the source video

  Scenario: Recipe captures the framework
    Given I open the Lo Mein Framework recipe
    Then it includes a noodle base, protein, vegetables, aromatics, sauce, and garnish
    And the instructions cook components separately before combining them

  Scenario: Sauce ratio is explicit
    Given I prepare the all-purpose noodle sauce
    Then the recipe specifies a 2:1:0.5 salty-to-sour-to-sweet ratio
    And garlic, ginger, sesame oil, and optional heat are identified as flavor additions

  Scenario: Recipe supports substitutions
    Given I do not have the example protein or vegetables
    When I follow the recipe
    Then the instructions identify practical substitute choices
    And the recipe remains usable without changing its core method
```

## Out of Scope

- Adding a UI for assembling custom recipe variations.
- Adding separate fixed recipes for chicken, beef, shrimp, or vegetarian lo mein.
- Reproducing the video's narration or copyrighted transcript verbatim.
- Adding photos or importing the recipe into MongoDB manually.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Cooklang recipe added | 1 entree recipe | Inspect `recipes/entrees/lo-mein-framework.cook` |
| Framework coverage | All six framework components present | Recipe review |
| Sauce ratio preserved | 2:1:0.5 | Recipe review |
| Recipe syntax | Parses without errors | Cooklang parser or recipe sync validation |

## Open Questions

- [x] Should this be a fixed chicken recipe? No; the requested framework is
  intentionally ingredient-flexible.

## References

- [Video: Why learning how to make Lo Mein changed my life](https://www.youtube.com/watch?v=eoRrxpErI0o)
- [Ethan Chlebowski's noodle framework](https://newsletter.ethanchlebowski.com/p/stir-fry-noodles-wo-recipe-framework)
- [`docs/COOKLANG.md`](../../docs/COOKLANG.md)
