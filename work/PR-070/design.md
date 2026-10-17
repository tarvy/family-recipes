# PR-070: Capture a recipe from a photo or voice note - Design

> **Status**: Approved
> **Last Updated**: 2026-10-17

## Overview

A device key posts 1 to 4 images or audio clips to `POST /api/captures`. A short tool-loop agent (Vercel AI SDK with Gemini) proposes Cooklang. `checkDraft` validates it with `parseCooklang`. `commitDraft` writes it through `createRecipe` or `updateRecipe` with source `capture`. The model never writes Mongo. The run continues in `after()` inside `submitCapture`. The POST waits up to 25 seconds, then answers 202.

## Data shape

A capture is a state machine. Stored status is `pending | drafted | saved | needs_attention | failed`. The cook sees `working | saved | needs_attention | failed`, derived from the record and the clock by `toView`. A pending or drafted row past its lease reads as `failed` with `retryable = attempt < MAX_ATTEMPTS`.

- `CaptureSubmission`. Media bytes with a SHA-256 each, the intent (`add`, or `change` with an optional slug), an optional note, and `key`. The key hashes the bytes, intent, and note. It is the idempotency key, unique in Mongo.
- `Draft`. Cooklang that `checkDraft` accepted. `checkDraft` is its only constructor. A change draft carries the base Cooklang the server read during the run.
- `Claim`. The fencing token for one attempt, `{ captureId, attempt }`. Only `openCapture` and `reclaimCapture` mint one. Run writes filter on capture id and attempt.

## Modules

| File | Owns |
|---|---|
| `src/lib/capture/index.ts` | Public surface: `submitCapture`, `getCapture`, `parseCaptureForm`. The lifecycle (`runCapture`) and `toView`. |
| `src/lib/capture/submission.ts` | Media policy, size limits, the capture key. |
| `src/lib/capture/draft.ts` | `Draft`, `checkDraft`, problem reasons. |
| `src/lib/capture/agent.ts` | `draftRecipe`. The only importer of `ai`. Read-only toward recipes. |
| `src/lib/capture/commit.ts` | `commitDraft`, `findCommittedDraft`. The only capture code that calls `createRecipe` or `updateRecipe`. |
| `src/lib/capture/store.ts` | Capture persistence, leases, claims. |
| `src/db/models/capture.model.ts` | Mongoose model, collection `captures`, TTL 30 days. Hashes and byte counts only, never bytes. |
| `src/lib/auth/api-key.ts` | Device keys. `authenticateApiKey`, `mintApiKey`, `listApiKeys`, `revokeApiKey`. |
| `src/db/models/api-key.model.ts` | Collection `api_keys`. Key id plus SHA-256 of the secret. |
| `scripts/api-key.ts` | CLI: `create`, `list`, `revoke`. |

## Budgets

The route's `maxDuration` literal is 60. The agent aborts at 45 seconds and takes at most 4 steps. The lease is 75 seconds, so a live run never loses its lease. A test ties the lease to the route literal.

## Recovery

Resubmitting the same bytes is the retry path. `openCapture` inserts, or returns the existing row. Before reclaiming, a drafted row past its lease is checked against the recipe. If the recipe's `rawCooklang` equals the draft, the row is marked saved. No model call, no attempt increment. `getCapture` does the same check. `reclaimCapture` takes a stalled or failed row with attempts left. A row that has a draft resumes at commit.

## Shared lists

`RECIPE_CATEGORIES` in `src/lib/recipes/categories.ts` is the one category list. Routes and components use it and `isRecipeCategory`. `RECIPE_SOURCES` in `src/db/types` includes `capture`. `AUDIT_SOURCES` derives from it.

## Repository

`updateRecipe` omits household fields (`photoUrls`, `primaryPhotoUrl`, `rating`, `cookLog`, `useCount`, `lastUsedAt`, `createdAt`) from `$set` for every caller. No flag.

## API

- `POST /api/captures`. Bearer device key with scope `captures:write`. Multipart: `media` (1 to 4 files), `intent` (`add` or `change`), optional `slug` (change only), optional `note`.
- `GET /api/captures/[id]`. Same key. Any family key can read any capture, because the capture key does not include the submitter.
