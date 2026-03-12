'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export interface DraggedRecipe {
  id: string;
  title: string;
  source: 'cookbook' | 'discovery';
  thumbnailUrl?: string;
}

export interface DragState {
  isDragging: boolean;
  draggedRecipe: DraggedRecipe | null;
  ghostPosition: { x: number; y: number } | null;
  expandedDay: string | null;
  expandedSlot: string | null;
}

export interface DragContextValue {
  state: DragState;
  startDrag: (recipe: DraggedRecipe) => void;
  updateGhostPosition: (x: number, y: number) => void;
  setExpandedDay: (day: string | null) => void;
  setExpandedSlot: (slot: string | null) => void;
  endDrag: () => void;
}

const INITIAL_STATE: DragState = {
  isDragging: false,
  draggedRecipe: null,
  ghostPosition: null,
  expandedDay: null,
  expandedSlot: null,
};

const DragContext = createContext<DragContextValue | null>(null);

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [state, setState] = useState<DragState>(INITIAL_STATE);

  const startDrag = useCallback((recipe: DraggedRecipe) => {
    setState((prev) => ({
      ...prev,
      isDragging: true,
      draggedRecipe: recipe,
      ghostPosition: null,
      expandedDay: null,
      expandedSlot: null,
    }));
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      ghostPosition: { x, y },
    }));
  }, []);

  const setExpandedDay = useCallback((day: string | null) => {
    setState((prev) => ({
      ...prev,
      expandedDay: day,
    }));
  }, []);

  const setExpandedSlot = useCallback((slot: string | null) => {
    setState((prev) => ({
      ...prev,
      expandedSlot: slot,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo(
    () => ({
      state,
      startDrag,
      updateGhostPosition,
      setExpandedDay,
      setExpandedSlot,
      endDrag,
    }),
    [state, startDrag, updateGhostPosition, setExpandedDay, setExpandedSlot, endDrag],
  );

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export function useDragContext() {
  const ctx = useContext(DragContext);
  if (!ctx) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return ctx;
}
