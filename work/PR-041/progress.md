# PR-041: Fix MCP Recipe CRUD Bugs - Progress

## Phase 1: Fix slug generation
- [ ] Fix `generateSlug` in `parser.ts` to use title/filename instead of full filePath
- [ ] Verify `createRecipe` produces correct slugs
- [ ] Verify `updateRecipe` doesn't compound slugs

## Phase 2: Fix recipe_get validation
- [ ] Change `recipe_get` handler to use `getRecipeDetail()` instead of `getRecipeBySlug()`
- [ ] Update `recipeDetailSchema` category to be optional or ensure it's always populated

## Phase 3: Verify
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
