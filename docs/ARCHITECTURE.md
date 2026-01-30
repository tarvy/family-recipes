# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTS: Web (React) │ Mobile (PWA) │ Claude Code │ Cursor │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  VERCEL: Next.js 15 App Router                              │
│  ├── Pages (SSR/SSG)                                        │
│  ├── API Routes (/api/*)                                    │
│  └── MCP Server (/mcp)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────┐
│ MongoDB Atlas │   │ Git Repository  │   │ Vercel Blob   │
│  (metadata)   │   │ (.cook files)   │   │  (photos)     │
└───────────────┘   └─────────────────┘   └───────────────┘
```

## Infrastructure

Infrastructure is managed directly via service dashboards:

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Database cluster, users, IP access |
| Vercel | Deployments, environment variables, blob storage |

## Observability

The runtime uses structured logging (Pino) to stdout, with Vercel Logs as the
primary debugging surface. Distributed tracing is intentionally disabled for
now; end-to-end observability can be reintroduced later if the project’s scale
ever warrants the added complexity.

## Data Flow

### Recipe Management

1. **Source of Truth**: Cooklang files (`.cook`) in `recipes/` directory
2. **Sync Process**: On git push, files are parsed and metadata synced to MongoDB
3. **Search**: Full-text search uses MongoDB text indexes (Atlas Search on M10+ tiers)
4. **Photos**: Stored in Vercel Blob, URLs referenced in database

### Authentication

1. **Magic Link**: Email → Token → Session (JWT in httpOnly cookie)
2. **Passkey**: WebAuthn credential → Session
3. **Sessions**: 30-day expiry, stored in database with TTL index

## Database Collections

### Users & Auth

```
users
├── _id (ObjectId)
├── email (unique)
├── name
├── role (owner | family | friend)
├── createdAt
└── updatedAt

sessions
├── _id (ObjectId)
├── userId (ref → users)
├── token (unique)
├── expiresAt (TTL index)
└── createdAt

magic_links
├── _id (ObjectId)
├── email
├── token (unique)
├── expiresAt (TTL index)
├── usedAt
└── createdAt

passkeys
├── _id (ObjectId)
├── userId (ref → users)
├── credentialId (unique)
├── publicKey
├── counter
├── deviceType
├── backedUp
├── transports []
├── createdAt
└── lastUsedAt
```

### Recipes

```
recipes
├── _id (ObjectId)
├── filePath (unique)
├── gitCommitHash
├── title
├── slug (unique)
├── description
├── servings
├── prepTime
├── cookTime
├── totalTime
├── difficulty
├── cuisine
├── course
├── ingredients [] (embedded)
│   ├── name
│   ├── quantity
│   └── unit
├── cookware [] (embedded)
│   ├── name
│   └── quantity
├── steps [] (embedded)
│   ├── text
│   ├── ingredients []
│   ├── cookware []
│   └── timers []
├── tags []
├── primaryPhotoUrl
├── photoUrls []
├── createdAt
├── updatedAt
└── lastSyncedAt

Text index on: title, description, ingredients.name, tags
```

### Shopping Lists (Embedded Items Pattern)

```
shopping_lists
├── _id (ObjectId)
├── userId (ref → users)
├── name
├── status (active | completed | archived)
├── items [] (embedded)
│   ├── _id (ObjectId)
│   ├── ingredientName
│   ├── quantity
│   ├── unit
│   ├── category
│   ├── isChecked
│   ├── checkedAt
│   ├── checkedByUserId
│   ├── sourceRecipeId
│   ├── isManuallyAdded
│   └── createdAt
├── recipes [] (embedded)
│   ├── recipeId (ref → recipes)
│   ├── servingsMultiplier
│   └── addedAt
├── createdAt
└── updatedAt
```

### User Interactions

```
recipe_favorites
├── _id (ObjectId)
├── userId (ref → users)
├── recipeId (ref → recipes)
└── createdAt

recipe_history
├── _id (ObjectId)
├── userId (ref → users)
├── recipeId (ref → recipes)
├── cookedAt
├── notes
└── rating (1-5)

recipe_notes
├── _id (ObjectId)
├── userId (ref → users)
├── recipeId (ref → recipes)
├── content
├── createdAt
└── updatedAt
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/magic-link` | POST | Request magic link |
| `/api/auth/verify` | GET | Verify magic link |
| `/api/auth/passkey/register` | POST | Start passkey registration |
| `/api/auth/passkey/authenticate` | POST | Authenticate with passkey |
| `/api/recipes` | GET | List recipes |
| `/api/recipes` | POST | Create recipe |
| `/api/recipes/[slug]` | GET | Get recipe |
| `/api/recipes/[slug]` | PUT | Update recipe |
| `/api/recipes/[slug]` | DELETE | Delete recipe |
| `/api/recipes/search` | GET | Search recipes |
| `/api/recipes/sync` | POST | Sync from git |
| `/api/shopping-lists` | GET/POST | List/create shopping lists |
| `/api/shopping-lists/[id]` | GET/PUT/DELETE | Shopping list CRUD |
| `/api/photos/upload` | POST | Upload photo |
| `/mcp` | POST | MCP server endpoint |

## MCP Tools

| Tool | Description |
|------|-------------|
| `recipe_search` | Search recipes by query, ingredients, cuisine, tags |
| `recipe_get` | Get full recipe by slug |
| `recipe_create` | Create new recipe |
| `recipe_edit` | Edit existing recipe |
| `recipe_list` | List all recipes |
| `shopping_list_create` | Create shopping list from recipes |
| `shopping_list_get` | Get current shopping list |
| `ingredient_lookup` | Find recipes by ingredient |
| `meal_plan_suggest` | Suggest meals |

## Security

- All routes behind auth middleware (except public MCP with API key)
- Sessions in httpOnly cookies (not accessible to JS)
- CSRF protection via SameSite cookie attribute
- Rate limiting on auth endpoints
- Input validation with Zod schemas
