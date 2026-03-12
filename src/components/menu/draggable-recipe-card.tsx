'use client';

/** Mini recipe card with pointer-based drag initiation. */

import { useRef } from 'react';
import type { DraggedRecipe } from './drag-context';
import { usePlannerDrag } from './use-planner-drag';

const DRAGGING_OPACITY = 0.5;

export interface SourceRecipe {
  id: string;
  title: string;
  source: 'cookbook' | 'discovery';
  thumbnailUrl?: string;
  category?: string;
}

interface DraggableRecipeCardProps {
  recipe: SourceRecipe;
}

export function DraggableRecipeCard({ recipe }: DraggableRecipeCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const dragPayload: DraggedRecipe = {
    id: recipe.id,
    title: recipe.title,
    source: recipe.source,
  };
  if (recipe.thumbnailUrl !== undefined) {
    dragPayload.thumbnailUrl = recipe.thumbnailUrl;
  }

  const { isDragging } = usePlannerDrag(dragPayload, cardRef);

  const initial = recipe.title.charAt(0).toUpperCase();

  return (
    <div
      ref={cardRef}
      className="w-28 flex-shrink-0 cursor-grab rounded-lg border border-border bg-card p-2 shadow-sm select-none"
      style={{ touchAction: 'none', opacity: isDragging ? DRAGGING_OPACITY : 1 }}
    >
      <div className="mb-1 flex h-16 items-center justify-center rounded bg-pink-light">
        <span className="text-lg font-bold text-pink-dark opacity-40">{initial}</span>
      </div>
      <p className="line-clamp-2 text-xs text-foreground" title={recipe.title}>
        {recipe.title}
      </p>
    </div>
  );
}
