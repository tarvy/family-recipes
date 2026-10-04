# PR-066: MCP Tool Output Schema Mismatches - Design

## Root cause

The SDK converts each tool's zod `outputSchema` to JSON Schema via zod v4
`toJSONSchema({ io: 'output' })`, which emits `additionalProperties: false`
for every `z.object`. The server-side check uses zod `safeParse`, which
silently strips unknown keys and passes, but the server returns the original
(unstripped) payload. The client (`Client.callTool`) validates that payload
with Ajv against the published JSON Schema and rejects it.

`recipe_get` returns `getRecipeDetail()` -> `toRecipeDetail()`, whose
`RecipeDetail` grew `updatedAt`, `rating`, `cookLog` (PR-046) and per-step
`ingredients`, while `recipeDetailSchema` in `src/mcp/tools/recipes.ts` was
never updated.

## Approach

- Declare the missing fields in `recipeDetailSchema` (no data dropped).
- `recipe_search` / `ingredient_lookup`: map stored nulls to undefined
  (zod optional rejects null server-side).
- New `src/mcp/__tests__/output-schemas.test.ts`: real SDK Client over
  InMemoryTransport, real unsaved Mongoose docs through production mappers,
  DB I/O stubbed; asserts every registered tool is covered.
