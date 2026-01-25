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
│ Neon Postgres │   │ Git Repository  │   │ Vercel Blob   │
│  (metadata)   │   │ (.cook files)   │   │  (photos)     │
└───────────────┘   └─────────────────┘   └───────────────┘
```

## Data Flow

### Recipe Management

1. **Source of Truth**: Cooklang files (`.cook`) in `recipes/` directory
2. **Sync Process**: On git push, files are parsed and metadata synced to Neon
3. **Search**: Full-text search uses PostgreSQL tsvector on synced metadata
4. **Photos**: Stored in Vercel Blob, URLs referenced in database

### Authentication

1. **Magic Link**: Email → Token → Session (JWT in httpOnly cookie)
2. **Passkey**: WebAuthn credential → Session
3. **Sessions**: 30-day expiry, stored in database

## Database Schema

### Users & Auth

```
users
├── id (uuid, primary key)
├── email (unique)
├── name
├── role (owner | family | friend)
├── created_at
└── updated_at

sessions
├── id (uuid)
├── user_id (fk → users)
├── token (unique)
├── expires_at
└── created_at

magic_links
├── id (uuid)
├── email
├── token (unique)
├── expires_at
├── used_at
└── created_at

passkeys
├── id (uuid)
├── user_id (fk → users)
├── credential_id (unique)
├── public_key
├── counter
├── device_type
├── backed_up
├── transports (jsonb)
├── created_at
└── last_used_at
```

### Recipes

```
recipes
├── id (uuid, primary key)
├── file_path (unique)
├── git_commit_hash
├── title
├── slug (unique)
├── description
├── servings
├── prep_time
├── cook_time
├── total_time
├── difficulty
├── cuisine
├── course
├── ingredients (jsonb)
├── cookware (jsonb)
├── steps (jsonb)
├── tags (jsonb)
├── primary_photo_url
├── photo_urls (jsonb)
├── search_vector
├── created_at
├── updated_at
└── last_synced_at
```

### Shopping Lists

```
shopping_lists
├── id (uuid, primary key)
├── user_id (fk → users)
├── name
├── status (active | completed | archived)
├── created_at
└── updated_at

shopping_list_items
├── id (uuid)
├── shopping_list_id (fk → shopping_lists)
├── ingredient_name
├── quantity
├── unit
├── category
├── is_checked
├── checked_at
├── checked_by_user_id
├── source_recipe_id
├── is_manually_added
└── created_at

shopping_list_recipes
├── id (uuid)
├── shopping_list_id (fk → shopping_lists)
├── recipe_id (fk → recipes)
├── servings_multiplier
└── added_at
```

### User Interactions

```
recipe_favorites
├── id (uuid)
├── user_id (fk → users)
├── recipe_id (fk → recipes)
└── created_at

recipe_history
├── id (uuid)
├── user_id (fk → users)
├── recipe_id (fk → recipes)
├── cooked_at
├── notes
└── rating (1-5)

recipe_notes
├── id (uuid)
├── user_id (fk → users)
├── recipe_id (fk → recipes)
├── content
├── created_at
└── updated_at
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
