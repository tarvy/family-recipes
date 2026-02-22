# PR-047: Stable Random Recipes - Design

## Approach
Cookie-based slug storage with client-side cookie setting and server-side reading.

## Data Flow
- Page Load (no cookie): page.tsx -> getRecipeSections(null) -> $sample -> RandomRecipeCookieSetter sets cookie
- Page Load (with cookie): page.tsx -> parse slugs -> getRecipeSections(slugs) -> find by slugs -> stable results
- Shuffle: ShuffleButton deletes cookie -> router.refresh() -> server sees no cookie -> fresh $sample

## Files Modified
- `src/lib/recipes/loader.ts` - getRandomRecipes(), cachedRandomSlugs param, randomSlugs in return
- `src/app/(main)/recipes/page.tsx` - cookie read/parse, pass to loader and client
- `src/components/recipes/recipe-browser.tsx` - needsRandomCookie prop, render cookie setter
- `src/components/recipes/recipe-section.tsx` - action slot prop
- `src/components/recipes/recipe-sections.tsx` - pass ShuffleButton as action

## New Files
- `src/components/recipes/shuffle-button.tsx` - clears cookie + router.refresh()
- `src/components/recipes/random-recipe-cookie.tsx` - sets cookie via useEffect
