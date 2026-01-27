interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

interface IngredientListProps {
  ingredients: Ingredient[];
}

/**
 * Display a list of recipe ingredients
 *
 * Features:
 * - Quantity and unit formatting
 * - Checkbox-style bullets for shopping list feel
 * - Warm, cozy styling matching design system
 */
export function IngredientList({ ingredients }: IngredientListProps) {
  if (ingredients.length === 0) {
    return <p className="text-muted-foreground italic">No ingredients listed for this recipe.</p>;
  }

  return (
    <ul className="space-y-2">
      {ingredients.map((ingredient) => (
        <li key={createIngredientKey(ingredient)} className="flex items-start gap-3">
          {/* Decorative bullet */}
          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-pink" aria-hidden="true" />
          <span className="text-foreground">{formatIngredient(ingredient)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Create a stable key for an ingredient
 */
function createIngredientKey(ingredient: Ingredient): string {
  return `${ingredient.name}-${ingredient.quantity ?? ''}-${ingredient.unit ?? ''}`;
}

/**
 * Format an ingredient for display
 * Examples: "2 cups flour", "1 tsp salt", "butter"
 */
function formatIngredient(ingredient: Ingredient): string {
  const parts: string[] = [];

  if (ingredient.quantity) {
    parts.push(ingredient.quantity);
  }

  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }

  parts.push(ingredient.name);

  return parts.join(' ');
}
