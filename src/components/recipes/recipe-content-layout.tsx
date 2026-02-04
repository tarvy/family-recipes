/**
 * Responsive two-column layout for recipe content.
 *
 * Switches from single-column (portrait) to two-column (landscape) layout
 * based on device orientation and minimum height.
 *
 * - Portrait: ingredients above instructions (stacked)
 * - Landscape (>= 480px height): ingredients left, instructions right
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
        flex flex-col gap-10
        [@media(orientation:landscape)_and_(min-height:480px)]:grid
        [@media(orientation:landscape)_and_(min-height:480px)]:grid-cols-[minmax(280px,1fr)_minmax(320px,2fr)]
        [@media(orientation:landscape)_and_(min-height:480px)]:gap-6
        [@media(orientation:landscape)_and_(min-height:480px)]:max-h-[70vh]
      `}
    >
      {/* Left column: Ingredients & Equipment */}
      <div
        className={`
          [@media(orientation:landscape)_and_(min-height:480px)]:overflow-y-auto
          [@media(orientation:landscape)_and_(min-height:480px)]:pr-4
        `}
      >
        {ingredientPanel}
      </div>

      {/* Right column: Instructions */}
      <div
        className={`
          [@media(orientation:landscape)_and_(min-height:480px)]:overflow-y-auto
          [@media(orientation:landscape)_and_(min-height:480px)]:border-l
          [@media(orientation:landscape)_and_(min-height:480px)]:border-border
          [@media(orientation:landscape)_and_(min-height:480px)]:pl-6
        `}
      >
        {instructionsPanel}
      </div>
    </div>
  );
}
