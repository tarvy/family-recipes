# PR-041: Fix MCP Recipe CRUD Bugs

## Problem Statement

Multiple MCP recipe tools are broken, preventing reliable recipe creation, updating, and retrieval via AI clients (Claude Desktop, etc.).

## User Stories

### As an MCP client, I want recipe_create to use the title from Cooklang frontmatter
**Given** I submit Cooklang content with `>> title: Cream Cheese Frosting`
**When** `recipe_create` processes the content
**Then** the recipe is saved with title "Cream Cheese Frosting" and slug "cream-cheese-frosting"

### As an MCP client, I want recipe_create slugs to never include the category
**Given** I create a recipe in the "desserts" category
**When** the slug is generated
**Then** the slug contains only the recipe name (e.g., "cream-cheese-frosting"), not "dessertscream-cheese-frosting"

### As an MCP client, I want recipe_update to preserve correct slugs
**Given** a recipe exists with slug "cream-cheese-frosting"
**When** I update it with new content
**Then** the slug is derived from the new content's title, not compounded with the category

### As an MCP client, I want recipe_get to return any recipe
**Given** a recipe exists in MongoDB
**When** I call `recipe_get` with its slug
**Then** I receive the full recipe detail without validation errors

## Acceptance Criteria

- [ ] `recipe_create` extracts title from `>> title:` metadata in Cooklang content
- [ ] Generated slugs never include the category prefix
- [ ] `recipe_update` does not compound category into slug on each call
- [ ] `recipe_get` succeeds for all recipes, including those without a `category` field
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
