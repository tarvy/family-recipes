/**
 * Responsive two-column layout for recipe content.
 *
 * Layout behavior:
 * - Default: Single column (ingredients above instructions)
 * - Mobile landscape (640px-1024px wide): Two columns for cooking mode
 *
 * Desktop (>1024px) stays single-column for better readability.
 * Mobile landscape triggers two-column so users can see ingredients while following steps.
 */

interface RecipeContentLayoutProps {
  /** Left column content (ingredients, equipment) */
  ingredientPanel: React.ReactNode;
  /** Right column content (instructions) */
  instructionsPanel: React.ReactNode;
}

export function RecipeContentLayout({
  ingredientPanel,
  instructionsPanel,
}: RecipeContentLayoutProps) {
  return (
    <div
      className={`
        flex flex-col gap-10 transition-all duration-200 ease-out
        [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex-row
        [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:gap-6
        [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:h-[calc(100vh-100px)]
      `}
    >
      {/* Left: Ingredients & Equipment — 40% in landscape two-column */}
      <div
        className={`
          min-w-0
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex-col
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex-[0.4_1_0]
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:min-h-0
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:pr-4
        `}
      >
        {ingredientPanel}
      </div>

      {/* Right: Instructions — 60% in landscape two-column */}
      <div
        className={`
          min-w-0
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex-col
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:flex-[0.6_1_0]
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:min-h-0
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:overflow-y-auto
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:border-l
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:border-border
          [@media(orientation:landscape)_and_(min-width:640px)_and_(max-width:1024px)]:pl-6
        `}
      >
        {instructionsPanel}
      </div>
    </div>
  );
}
