'use client';

/**
 * Navigation Drawer
 *
 * Slide-in drawer from left for mobile/tablet navigation.
 * Includes overlay backdrop and touch-to-close functionality.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useNavigation } from './header-context';
import { NAV_LINKS, NavLinkItem } from './nav-links';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

/** Drawer width in pixels */
const DRAWER_WIDTH_PX = 280;

/**
 * Navigation drawer component
 */
export function NavDrawer() {
  const { isDrawerOpen, closeDrawer } = useNavigation();
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Only render portal after client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus trap and focus management
  useEffect(() => {
    if (isDrawerOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isDrawerOpen]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeDrawer();
      }
    }

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen, closeDrawer]);

  // Don't render until mounted on client AND drawer is open
  if (!(mounted && isDrawerOpen)) {
    return null;
  }

  return createPortal(
    <>
      {/* Overlay backdrop */}
      <div
        className={`fixed inset-0 bg-foreground/50 transition-opacity ${
          isDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ zIndex: NAV_Z_INDEX.overlay }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed bottom-0 left-0 top-0 bg-card shadow-lg transition-transform ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: DRAWER_WIDTH_PX,
          zIndex: NAV_Z_INDEX.drawer,
          transitionDuration: 'var(--duration-normal, 300ms)',
          transitionTimingFunction: 'var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="text-lg font-bold text-foreground">Menu</span>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-2 text-foreground hover:bg-pink-light"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="p-4">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <NavLinkItem link={link} onClick={closeDrawer} variant="drawer" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>,
    document.body,
  );
}

/**
 * Close (X) icon
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
