# Recipe Capture

## Overview

A phone Shortcut posts photos of a recipe card, or a voice note, to `POST /api/captures`. A short agent (Vercel AI SDK with Gemini) reads them and proposes Cooklang. The server checks the draft with `parseCooklang`, the parser the recipe repository uses. Then it saves the draft through `createRecipe` or `updateRecipe` with source `capture`. The model never writes to MongoDB.

Capture writes MongoDB only, like the API and MCP write paths. It writes no `.cook` file. A full git sync can remove a recipe that capture created, and the next sync overwrites a capture change to a git-backed recipe.

## Device keys

Each phone gets its own key. The user must have signed in once and must have a family role.

```bash
npm run api-key -- create --email sam@family.example --label "Sam's iPhone"
npm run api-key -- list
npm run api-key -- revoke --key-id <keyId>
```

`create` prints the token (`frk_...`) once. The server stores only its SHA-256. Demoting the user to `friend` disables every key they own.

## Shortcut setup

New recipe from a card:

1. Take Photo (front). Take Photo again for the back, if needed.
2. Resize Image to a longest edge of 2000 px. Convert Image to JPEG.
3. Get Contents of URL: `POST https://recipes.tarvy.dev/api/captures`, header `Authorization: Bearer frk_...`, form fields `intent = add` and `media = <photo>` (once per photo). Add `note` if you like, such as "Grandma's; she halved the sugar".
4. If `status` is `working`, wait 20 seconds, then Get Contents of URL `statusUrl` with the same header.
5. Show Notification with `message`.

Change a recipe by voice: Record Audio, then post it with `intent = change`. Say which recipe and what to change, such as "In the white chicken chili, use two cans of beans instead of one." To skip the search, add `slug = moms-white-chicken-chili`.

## Request

`POST /api/captures`, `multipart/form-data`, `Authorization: Bearer frk_...` with scope `captures:write`.

| Field | Required | Notes |
|-------|----------|-------|
| `media` | Yes | 1 to 4 files, 4.4 MB total. JPEG, PNG, WebP, HEIC, HEIF, M4A (`audio/mp4`, `audio/x-m4a`), MP3, AAC, WAV, OGG, WebM. |
| `intent` | No | `add` (default) or `change`. `add` never overwrites an existing recipe. |
| `slug` | No | `change` only. Pins the recipe to change. |
| `note` | No | Up to 1,000 characters. |

`GET /api/captures/[id]` returns the same view. Any family key can read any capture.

## Response

```json
{
  "id": "6710c1f2a9e4b1c3d2e5f601",
  "status": "saved",
  "change": "created",
  "message": "Saved \"Grandma's Meatloaf\" to entrees.",
  "recipe": { "slug": "grandmas-meatloaf", "title": "Grandma's Meatloaf", "category": "entrees" },
  "warnings": ["Oven temperature was smudged; used 350°F."],
  "recipeUrl": "https://recipes.tarvy.dev/recipes/grandmas-meatloaf",
  "statusUrl": "https://recipes.tarvy.dev/api/captures/6710c1f2a9e4b1c3d2e5f601"
}
```

| HTTP | When |
|------|------|
| 200 | The capture settled: `saved`, `needs_attention`, or `failed`. |
| 202 | Still `working`. `Location` and `Retry-After` point at `statusUrl`. |
| 400, 413, 415 | Bad form, files too large, or an unsupported file type. `error` names the problem. |
| 401, 403 | Missing or invalid key, or a key without the scope or a family role. |

| `status` | Meaning |
|----------|---------|
| `working` | Still running. Poll `statusUrl`. |
| `saved` | The recipe was created or updated. `warnings` lists anything the agent guessed. |
| `needs_attention` | Finished without saving. `reason` says why. `candidates` lists relevant slugs. |
| `failed` | The run failed or was interrupted. `retryable` says whether sending the same files again retries it. |

| `reason` | Meaning |
|----------|---------|
| `not_a_recipe` | The media isn't a recipe. |
| `unreadable` | The agent couldn't make it out. |
| `duplicate` | An add matches an existing recipe. Use `change` instead. |
| `ambiguous_target` | A change matches several recipes. Send a `slug`. |
| `target_not_found` | The recipe to change doesn't exist. |
| `target_has_no_cooklang` | The recipe to change has no stored Cooklang, so it can't be changed safely. |
| `conflict` | The recipe changed while the capture ran. Nothing was overwritten. |
| `gave_up` | No valid draft within the step budget. |

## Retries

The same files with the same intent and note are the same capture. Sending them again returns the stored result once the capture settled. An interrupted or failed capture runs again, up to 3 attempts. A capture that already saved its recipe is marked saved without calling the model. `GET` never starts a new attempt.

Capture records expire after 30 days. Media bytes are never stored, only their hashes and sizes.

## Time budget

The POST waits up to 25 seconds for the result, then answers 202. The route's `maxDuration` is 60 seconds. The agent takes at most 4 model steps and aborts at 45 seconds. The lease on an attempt is 75 seconds, longer than the route can run. A test keeps those in order.

## Configuration

`GOOGLE_GENERATIVE_AI_API_KEY` is required. `CAPTURE_MODEL` is optional and defaults to `gemini-2.5-flash`. See [ENVIRONMENT.md](ENVIRONMENT.md).

## Code

| Path | Owns |
|------|------|
| `src/app/api/captures/` | HTTP routes and status mapping |
| `src/lib/capture/index.ts` | `submitCapture`, `getCapture`, the lifecycle, and what the cook sees |
| `src/lib/capture/agent.ts` | The model, prompt, and tools. Reads recipes only. |
| `src/lib/capture/draft.ts` | `checkDraft` |
| `src/lib/capture/commit.ts` | The only capture code that calls `createRecipe` or `updateRecipe` |
| `src/lib/capture/store.ts` | Capture state, leases, and claims |
| `src/db/models/capture.model.ts` | The `captures` collection |
| `src/lib/auth/api-key.ts`, `scripts/api-key.ts` | Device keys |
