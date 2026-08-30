# PR-061 — Design

## Approach

Add `src/mcp/tools/menu.ts` (`registerMenuTools`) as thin wrappers over
`@/lib/menu/service.ts`, mirroring `/api/menu*` semantics. Register it in
`src/mcp/server.ts` alongside the recipe and shopping tools. Follow the existing
tool pattern in `shopping.ts`: `registerTool` with a Zod input/output schema,
`withTrace(...)`, structured logging via `logger.mcp`, and `buildToolResult`.

## Tools

| Tool | Scope | Service call |
|------|-------|--------------|
| `menu_get_week` | `menu:read` | `getOrCreateMenuForWeek(ownerId, weekLabel?)` |
| `menu_add_dinner` | `menu:write` | `getRecipeBySlug` → `addAssignment(menuId, {recipeId,title,source:'cookbook',day,mealSlot})` |
| `menu_remove_assignment` | `menu:write` | `removeAssignment(menuId, assignmentId)` |
| `menu_send_survey` | `menu:write` | `sendSurvey(menuId)` |
| `menu_finalize` | `menu:write` | `finalizeMenu(menuId, ownerId)` |

## Owner resolution

Menu tools resolve the acting owner exactly like the shopping tools do —
`userEmail` if supplied, else `OWNER_EMAIL`. The duplicated `resolveUser` logic
in `shopping.ts` is lifted to `src/mcp/tools/utils.ts` as `resolveMcpUser` and
shared by both tool modules (removes a DRY violation). Threading the real
authenticated `userId` from the token is deliberately deferred to PR-062, which
reworks auth-context for all tools together.

## Serialization

`serializeMenu(menu)` converts a persisted menu document to a plain object:
`{ id, weekLabel, status, weekStartDate (ISO), assignments[] }`, where each
assignment is `{ assignmentId, title, source, day, mealSlot, recipeId? }`. The
assignment `_id` (mongoose subdocument id) becomes the `assignmentId` used by
`menu_remove_assignment`. This is the one piece of pure logic and is unit-tested.

## Lifecycle & errors

Menu invariants are enforced by the service (`MenuError`), not re-implemented:
`addAssignment`/`removeAssignment` require `building` status; `finalizeMenu`
requires `survey-sent`. `menu_send_survey` is included so the finalize path is
reachable end-to-end from the connector.

## Wiring changes

- `src/lib/oauth/types.ts`: add `menu:read`/`menu:write` to `OAUTH_SCOPES` and
  the five tool entries to `TOOL_SCOPES`. `VALID_SCOPES`, consent page, and
  authorize/token scope validation all derive from `OAUTH_SCOPES`, so they pick
  the scopes up automatically.
- `src/app/authorize/page.tsx`: `SCOPE_ICONS` is typed `Record<OAuthScope,…>`,
  so it needs an icon entry for each new scope (calendar glyph).
- `src/mcp/server.ts`: register the tools; refresh `MCP_INSTRUCTIONS` (recipes
  are DB-backed, not folder files) and add a Meal-Planning section.
- `vitest.config.ts`: add the `@ → ./src` path alias so aliased modules are
  testable (existing tests happened to be alias-free).

## Test strategy

Unit tests only (no DB harness exists): `serializeMenu` output shape (ids/dates
to strings, cookbook vs discovery assignment, recipeId omission) and the scope
wiring (`menu:*` in `VALID_SCOPES`, per-tool `getToolScopes`).
