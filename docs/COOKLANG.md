# Cooklang Integration

This document describes how to write recipes using Cooklang syntax and sync them to the application.

## Cooklang Syntax

Cooklang is a markup language for recipes. Full specification at [cooklang.org](https://cooklang.org/).

### Basic Syntax

```cooklang
>> title: Beef Tacos
>> servings: 4
>> prep time: 15 minutes
>> cook time: 20 minutes
>> tags: mexican, quick, dinner

Season @ground beef{1%lb} with @cumin{1%tsp} and @chili powder{2%tsp}.

Cook in a #skillet{} over medium heat for ~{10%minutes} until browned.

Warm @tortillas{8} in a #microwave{} for ~{30%seconds}.

Serve with @sour cream{}, @cheese{1%cup}, and @salsa{}.
```

### Metadata

Metadata uses the `>> key: value` syntax at the top of the file:

| Key | Description | Example |
|-----|-------------|---------|
| `title` | Recipe name | `>> title: Beef Tacos` |
| `description` | Brief description | `>> description: Quick weeknight dinner` |
| `servings` | Number of servings | `>> servings: 4` |
| `prep time` | Preparation time | `>> prep time: 15 minutes` |
| `cook time` | Cooking time | `>> cook time: 20 minutes` |
| `total time` | Total time (if different from prep + cook) | `>> total time: 45 minutes` |
| `difficulty` | Skill level | `>> difficulty: easy` |
| `cuisine` | Cuisine type | `>> cuisine: Mexican` |
| `course` | Meal course | `>> course: dinner` |
| `tags` | Comma-separated tags | `>> tags: quick, healthy, vegetarian` |
| `source` | Recipe source URL | `>> source: https://example.com/recipe` |
| `author` | Recipe author | `>> author: Grandma Rose` |
| `diet` | Dietary restrictions (comma-separated) | `>> diet: gluten-free, vegetarian` |
| `locale` | Language/locale | `>> locale: en_US` |

### Metadata Aliases

For compatibility with the Cooklang specification and recipes from external sources, the following key aliases are supported:

| Canonical Key | Aliases | Notes |
|---------------|---------|-------|
| `servings` | `serves`, `yield` | Extracts first number (e.g., "12 cookies" → 12) |
| `total time` | `time`, `duration`, `time required` | |
| `description` | `introduction` | |

### Time Format

Time values support both verbose and compact formats:

**Verbose format** (traditional):
```cooklang
>> prep time: 30 minutes
>> cook time: 1 hour
>> total time: 1.5 hours
```

**Compact format** (Cooklang specification):
```cooklang
>> prep time: 30m
>> cook time: 1h
>> total time: 1h30m
```

Supported units: `h` (hours), `m` (minutes), `hours`, `hour`, `hr`, `hrs`, `minutes`, `minute`, `min`, `mins`

### Ingredients

Use `@` to mark ingredients:

```cooklang
@salt                    -- Simple ingredient
@olive oil{2%tbsp}       -- With quantity and unit
@eggs{3}                 -- Quantity only
@all purpose flour{2%cups}  -- Multi-word ingredient
```

### Cookware

Use `#` to mark cookware:

```cooklang
#pot                     -- Simple cookware
#large mixing bowl{}     -- Multi-word cookware
#baking sheets{2}        -- With quantity
```

### Timers

Use `~` to mark cooking times:

```cooklang
~{10%minutes}            -- Anonymous timer
~baking{25%minutes}      -- Named timer
~{30%seconds}            -- Different units
```

## File Organization

Place recipe files in the `recipes/` directory:

```
recipes/
  breakfast/
    pancakes.cook
    omelette.cook
  dinner/
    beef-tacos.cook
    pasta-carbonara.cook
  desserts/
    chocolate-cake.cook
```

### Photos

Photos follow the Cooklang naming convention:

```
recipes/
  beef-tacos.cook           -- Recipe file
  beef-tacos.jpg            -- Primary photo
  beef-tacos.1.jpg          -- Step 1 photo
  beef-tacos.2.jpg          -- Step 2 photo
```

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

## Sync API

### Endpoint

```
POST /api/recipes/sync
```

### Authentication

Two methods are supported:

1. **Session cookie** - Must be logged in as owner
2. **Webhook secret** - `X-Webhook-Secret` header matching `RECIPE_SYNC_SECRET` env var

### Request

```json
{
  "mode": "full",      // or "incremental"
  "dryRun": false      // Set to true to preview changes
}
```

Query parameter alternative:
```
POST /api/recipes/sync?mode=incremental
```

### Response

```json
{
  "success": true,
  "summary": {
    "scanned": 25,
    "created": 3,
    "updated": 2,
    "deleted": 1,
    "skipped": 19,
    "errors": 0
  },
  "durationMs": 1234
}
```

### Sync Modes

| Mode | Description |
|------|-------------|
| `full` | Sync all recipes, delete ones not in filesystem |
| `incremental` | Only sync changed files (by git commit hash) |

## CI/CD Integration

### GitHub Actions

```yaml
name: Sync Recipes

on:
  push:
    paths:
      - 'recipes/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync recipes
        run: |
          curl -X POST \
            -H "X-Webhook-Secret: ${{ secrets.RECIPE_SYNC_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"mode": "incremental"}' \
            https://your-app.vercel.app/api/recipes/sync
```

### Vercel Deploy Hook

Create a deploy hook in Vercel and add a post-deploy script:

```bash
curl -X POST \
  -H "X-Webhook-Secret: $RECIPE_SYNC_SECRET" \
  https://your-app.vercel.app/api/recipes/sync
```

## Environment Variables

Add to your `.env`:

```bash
# Directory containing .cook files (relative to project root)
RECIPES_DIRECTORY=recipes

# Secret for webhook authentication
RECIPE_SYNC_SECRET=your-secret-here
```

## Programmatic Usage

```typescript
import { parseCooklang, serializeToCooklang } from '@/lib/cooklang';
import { syncRecipes } from '@/lib/git-recipes';

// Parse a single recipe
const result = await parseCooklang(source, {
  filePath: 'recipes/tacos.cook',
  gitCommitHash: 'abc123',
});

if (result.success) {
  console.log(result.recipe.title);
  console.log(result.recipe.ingredients);
}

// Serialize back to Cooklang
const cooklangSource = serializeToCooklang(result.recipe);

// Sync all recipes
const syncResult = await syncRecipes({ mode: 'full' });
console.log(`Created: ${syncResult.summary.created}`);
```

## Troubleshooting

### Common Issues

**No recipes found**
- Check that `RECIPES_DIRECTORY` points to the correct directory
- Ensure files have `.cook` extension
- Verify the directory exists and is readable

**Parse errors**
- Check Cooklang syntax (especially matching braces)
- Verify metadata uses `>>` prefix
- Ensure ingredient quantities are formatted correctly

**Auth errors**
- For session auth: must be logged in as owner
- For webhook: verify `RECIPE_SYNC_SECRET` matches header value

### Logs

Recipe sync operations are logged under the `recipes` context:

```
[recipes] Recipe sync completed {
  mode: "full",
  created: 3,
  updated: 2,
  deleted: 0
}
```
