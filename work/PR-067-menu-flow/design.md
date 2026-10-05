# PR-067: Weekly Menu Flow Fixes - Design

## Slug resolution

`POST /api/menu/[id]/assignments` accepts `recipeSlug` for `source: cookbook`.
When no `recipeId` is given it calls `getRecipeBySlug` and uses the stored
recipe's `_id` and title. The planner sends `recipeSlug` instead of `recipeId`.

## Validation in the service

`addAssignment` rejects non-canonical ids (`isObjectIdString`, 24 hex chars;
12-char strings are rejected too) and cookbook/discovery assignments missing
their recipe id with `MenuError('BAD_REQUEST')`, so both web and MCP callers
get 400 instead of 500. `removeAssignment` maps a malformed id to NOT_FOUND.

## Voting link

`buildVotingUrl(token)` in `src/lib/menu/service.ts` prefixes
`NEXT_PUBLIC_APP_URL` (fallback `OAUTH_ISSUER`, else relative). The planner's
`SurveyShare` component builds the link from `window.location.origin` and the
menu's `votingToken`, with copy button, voter names and close time.

## Errors

`PlannerActions` takes `onMessage`; `callStatusAction` returns the parsed body
or reports the API's `error`. Assign/remove failures are reported the same way.
Finalize alerts (excluded discovery recipes) are shown after lock-in.

## Vote route

`isVotingOpen` requires `status === 'survey-sent'` and an unexpired window.
POST dedupes picks and requires each to be an assignment id on the menu.

## Tests

`src/lib/menu/__tests__/menu-flow.test.ts` (route handlers + service with the
repository, recipe lookup and session mocked).
