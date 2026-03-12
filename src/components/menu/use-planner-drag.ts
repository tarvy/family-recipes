'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { type DraggedRecipe, useDragContext } from './drag-context';

const GHOST_SCALE = 0.75;
const GHOST_OPACITY = 0.9;
const GHOST_Z_INDEX = 9999;

interface PointerOffset {
  x: number;
  y: number;
}

interface PlannerDragResult {
  isDragging: boolean;
}

function positionGhost(
  ghost: HTMLElement,
  clientX: number,
  clientY: number,
  offset: PointerOffset,
) {
  ghost.style.left = `${clientX - offset.x}px`;
  ghost.style.top = `${clientY - offset.y}px`;
}

function removeGhostElement(ghostRef: RefObject<HTMLElement | null>) {
  const ghost = ghostRef.current;
  if (ghost) {
    ghost.remove();
    ghostRef.current = null;
  }
}

export function usePlannerDrag(
  recipe: DraggedRecipe,
  elementRef: RefObject<HTMLElement | null>,
): PlannerDragResult {
  const { state, startDrag, updateGhostPosition, endDrag } = useDragContext();
  const ghostRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerOffsetRef = useRef<PointerOffset>({ x: 0, y: 0 });

  const cleanupDrag = useCallback(() => {
    removeGhostElement(ghostRef);
    pointerIdRef.current = null;
    endDrag();
  }, [endDrag]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      const ghost = ghostRef.current;
      if (!ghost) {
        return;
      }

      positionGhost(ghost, event.clientX, event.clientY, pointerOffsetRef.current);
      updateGhostPosition(event.clientX, event.clientY);
    },
    [updateGhostPosition],
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      const element = elementRef.current;
      if (element?.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }

      cleanupDrag();
    },
    [cleanupDrag, elementRef],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      const element = elementRef.current;
      if (!element) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      pointerIdRef.current = event.pointerId;

      const rect = element.getBoundingClientRect();
      pointerOffsetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      element.setPointerCapture(event.pointerId);
      startDrag(recipe);

      const ghost = element.cloneNode(true);
      if (!(ghost instanceof HTMLElement)) {
        return;
      }

      ghost.style.position = 'fixed';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = String(GHOST_Z_INDEX);
      ghost.style.transform = `scale(${GHOST_SCALE})`;
      ghost.style.opacity = String(GHOST_OPACITY);
      ghost.style.transition = 'none';

      positionGhost(ghost, event.clientX, event.clientY, pointerOffsetRef.current);
      document.body.appendChild(ghost);
      ghostRef.current = ghost;

      updateGhostPosition(event.clientX, event.clientY);
    },
    [elementRef, recipe, startDrag, updateGhostPosition],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerEnd);
    element.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerEnd);
      element.removeEventListener('pointercancel', handlePointerEnd);
      removeGhostElement(ghostRef);
    };
  }, [elementRef, handlePointerDown, handlePointerMove, handlePointerEnd]);

  const isDragging =
    state.isDragging &&
    state.draggedRecipe?.id === recipe.id &&
    state.draggedRecipe.source === recipe.source;

  return { isDragging };
}
