'use client';

/**
 * ContextMenu Component
 *
 * Floating context menu positioned at touch/click coordinates.
 * Dismisses on click outside.
 */

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Icon stroke width for menu item icons */
const ICON_STROKE_WIDTH = 2;

/** Menu padding from viewport edges */
const VIEWPORT_PADDING_PX = 16;

/** Estimated menu width for positioning */
const MENU_WIDTH_PX = 200;

/** Estimated menu item height for positioning */
const MENU_ITEM_HEIGHT_PX = 44;

export interface ContextMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Whether the item is destructive (red text) */
  destructive?: boolean;
}

export interface ContextMenuProps {
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Position to display the menu */
  position: { x: number; y: number };
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
}

/**
 * Context menu component
 */
export function ContextMenu({ items, position, isOpen, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position with viewport bounds checking
  const getAdjustedPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return position;
    }

    const estimatedHeight = items.length * MENU_ITEM_HEIGHT_PX + 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + MENU_WIDTH_PX > viewportWidth - VIEWPORT_PADDING_PX) {
      x = viewportWidth - MENU_WIDTH_PX - VIEWPORT_PADDING_PX;
    }
    if (x < VIEWPORT_PADDING_PX) {
      x = VIEWPORT_PADDING_PX;
    }

    // Adjust vertical position
    if (y + estimatedHeight > viewportHeight - VIEWPORT_PADDING_PX) {
      y = viewportHeight - estimatedHeight - VIEWPORT_PADDING_PX;
    }
    if (y < VIEWPORT_PADDING_PX) {
      y = VIEWPORT_PADDING_PX;
    }

    return { x, y };
  }, [position, items.length]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Small delay to prevent immediate close from the triggering event
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === 'undefined') {
    return null;
  }

  const adjustedPosition = getAdjustedPosition();

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-border"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <ul className="py-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-pink-light ${
                item.destructive ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {item.icon && <span className="h-5 w-5">{item.icon}</span>}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body,
  );
}

/**
 * Edit/pencil icon for context menu
 */
export function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-5 w-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

/**
 * Shopping cart/add icon for context menu
 */
export function AddToCartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-5 w-5'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M12 9v3m0 0v3m0-3h3m-3 0H9"
      />
    </svg>
  );
}
