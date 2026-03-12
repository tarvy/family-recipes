'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { DayOfWeek, MealSlot } from '@/db/types';
import { type DraggedRecipe, useDragContext } from './drag-context';

const EXPANSION_DELAY_MS = 700;
const COLLAPSE_DELAY_MS = 300;
const RESIZE_THROTTLE_MS = 100;
const DEFAULT_MEAL_SLOT: MealSlot = 'dinner';

interface DropTargetResult {
  ref: RefObject<HTMLDivElement | null>;
  isOver: boolean;
  isExpanded: boolean;
}

function pointInRect(point: { x: number; y: number }, rect: DOMRect) {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

function clearTimer(timerRef: RefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export function useDropTarget(
  day: DayOfWeek,
  onDrop: (recipe: DraggedRecipe, day: string, slot: string) => void,
): DropTargetResult {
  const ref = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const dragStateRef = useRef(false);
  const isOverRef = useRef(false);
  const draggedRecipeRef = useRef<DraggedRecipe | null>(null);
  const expandedDayRef = useRef<string | null>(null);
  const expandedSlotRef = useRef<string | null>(null);
  const expansionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOver, setIsOver] = useState(false);
  const { state, setExpandedDay, setExpandedSlot } = useDragContext();

  const setOverState = useCallback((value: boolean) => {
    isOverRef.current = value;
    setIsOver(value);
  }, []);

  const collapseAfterDelay = useCallback(
    (currentDay: DayOfWeek) => {
      clearTimer(collapseTimerRef);
      collapseTimerRef.current = setTimeout(() => {
        if (expandedDayRef.current === currentDay) {
          setExpandedDay(null);
          setExpandedSlot(null);
        }
        collapseTimerRef.current = null;
      }, COLLAPSE_DELAY_MS);
    },
    [setExpandedDay, setExpandedSlot],
  );

  const handleDragInactive = useCallback(() => {
    if (isOverRef.current) {
      setOverState(false);
    }
    clearTimer(expansionTimerRef);
  }, [setOverState]);

  const handlePointerEnter = useCallback(
    (currentDay: DayOfWeek) => {
      clearTimer(collapseTimerRef);
      if (!isOverRef.current) {
        setOverState(true);
      }
      if (expansionTimerRef.current) {
        return;
      }
      expansionTimerRef.current = setTimeout(() => {
        setExpandedDay(currentDay);
        expansionTimerRef.current = null;
      }, EXPANSION_DELAY_MS);
    },
    [setExpandedDay, setOverState],
  );

  const handlePointerLeave = useCallback(
    (currentDay: DayOfWeek) => {
      if (isOverRef.current) {
        setOverState(false);
      }
      clearTimer(expansionTimerRef);
      collapseAfterDelay(currentDay);
    },
    [collapseAfterDelay, setOverState],
  );

  useEffect(() => {
    draggedRecipeRef.current = state.draggedRecipe;
    expandedDayRef.current = state.expandedDay;
    expandedSlotRef.current = state.expandedSlot;
  }, [state.draggedRecipe, state.expandedDay, state.expandedSlot]);

  useEffect(() => {
    function updateRect() {
      rectRef.current = ref.current?.getBoundingClientRect() ?? null;
    }

    function handleResize() {
      if (resizeThrottleRef.current) {
        return;
      }

      resizeThrottleRef.current = setTimeout(() => {
        resizeThrottleRef.current = null;
        updateRect();
      }, RESIZE_THROTTLE_MS);
    }

    updateRect();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeThrottleRef.current) {
        clearTimeout(resizeThrottleRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!(state.isDragging && state.ghostPosition)) {
      handleDragInactive();
      return;
    }

    const rect = rectRef.current;
    if (!rect) {
      return;
    }

    const isNowOver = pointInRect(state.ghostPosition, rect);
    if (isNowOver) {
      handlePointerEnter(day);
      return;
    }

    handlePointerLeave(day);
  }, [
    day,
    handleDragInactive,
    handlePointerEnter,
    handlePointerLeave,
    state.ghostPosition,
    state.isDragging,
  ]);

  useEffect(() => {
    const wasDragging = dragStateRef.current;
    const isDragging = state.isDragging;

    if (wasDragging && !isDragging && isOverRef.current) {
      const recipe = draggedRecipeRef.current;
      if (recipe) {
        const isExpandedDay = expandedDayRef.current === day;
        const expandedSlot = expandedSlotRef.current;
        const slot = isExpandedDay && expandedSlot ? expandedSlot : DEFAULT_MEAL_SLOT;
        onDrop(recipe, day, slot);
      }

      setOverState(false);
      setExpandedDay(null);
      setExpandedSlot(null);
    }

    dragStateRef.current = isDragging;
  }, [day, onDrop, setExpandedDay, setExpandedSlot, setOverState, state.isDragging]);

  useEffect(() => {
    return () => {
      clearTimer(expansionTimerRef);
      clearTimer(collapseTimerRef);
      clearTimer(resizeThrottleRef);
    };
  }, []);

  const isExpanded = state.expandedDay === day;

  return { ref, isOver, isExpanded };
}
