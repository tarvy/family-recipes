/**
 * Cooklang syntax guide for AI writers.
 *
 * One copy, interpolated by the MCP server instructions and the capture
 * agent's prompt.
 *
 * Usage:
 *   import { COOKLANG_GUIDE } from '@/lib/cooklang/guide';
 */

export const COOKLANG_GUIDE = `## Cooklang Format

Recipes are written in Cooklang, a markup language for recipes. Here's how it works:

### Metadata (at top of file)
\`\`\`
>> title: Recipe Name
>> servings: 4
>> prep time: 15 minutes
>> cook time: 30 minutes
>> total time: 45 minutes
>> source: https://example.com/recipe
>> description: A brief description of the dish
>> cuisine: Italian
>> course: dinner
>> tags: quick, weeknight, vegetarian
\`\`\`

### Ingredients
Ingredients are marked with \`@\` followed by the name and optional quantity/unit in braces:
- \`@chicken breast{2%lbs}\` → 2 lbs chicken breast
- \`@olive oil{3%tbsp}\` → 3 tbsp olive oil
- \`@garlic{4%cloves}\` → 4 cloves garlic
- \`@onion{1}\` → 1 onion (no unit needed)
- \`@salt and pepper{}\` → salt and pepper to taste (no quantity)

### Cookware
Cookware is marked with \`#\`:
- \`#large skillet{}\` → large skillet
- \`#baking sheet{2}\` → 2 baking sheets

### Timers
Timers use \`~\`:
- \`~{15%minutes}\` → 15 minutes
- \`~{2%hours}\` → 2 hours

### Steps
Steps are written as regular paragraphs. Ingredients, cookware, and timers are embedded inline:

\`\`\`
Heat @olive oil{2%tbsp} in a #large skillet{} over medium heat. Add @chicken breast{1%lb}
and cook for ~{5%minutes} per side until golden brown.
\`\`\``;
