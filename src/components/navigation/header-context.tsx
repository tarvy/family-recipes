'use client';

/**
 * Navigation Context
 *
 * Provides centralized state management for navigation components
 * including drawer, search modal, and header collapse state.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { HEADER_FOLD_THRESHOLD_PX, SCROLL_THRESHOLD_PX } from '@/lib/constants/navigation';

interface NavigationContextValue {
  /** Whether the mobile navigation drawer is open */
  isDrawerOpen: boolean;
  /** Whether the search modal is open */
  isSearchOpen: boolean;
  /** Whether the header is collapsed (scrolled down) */
  isHeaderCollapsed: boolean;
  /** Open the navigation drawer */
  openDrawer: () => void;
  /** Close the navigation drawer */
  closeDrawer: () => void;
  /** Toggle the navigation drawer */
  toggleDrawer: () => void;
  /** Open the search modal */
  openSearch: () => void;
  /** Close the search modal */
  closeSearch: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

/**
 * Custom hook to track scroll direction and header collapse state
 */
function useScrollDirection() {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      // Only update if we've scrolled past the threshold
      if (Math.abs(scrollDelta) < SCROLL_THRESHOLD_PX) {
        return;
      }

      // Collapse when scrolling down past threshold, expand when scrolling up
      if (scrollDelta > 0 && currentScrollY > HEADER_FOLD_THRESHOLD_PX) {
        setIsHeaderCollapsed(true);
      } else if (scrollDelta < 0) {
        setIsHeaderCollapsed(false);
      }

      setLastScrollY(currentScrollY);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return isHeaderCollapsed;
}

/**
 * Navigation state provider
 */
export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isHeaderCollapsed = useScrollDirection();

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Keyboard shortcuts: Cmd+K/Ctrl+K for search, Escape to close modals
  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent): boolean {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key === 'k';
      if (!isSearchShortcut) {
        return false;
      }

      event.preventDefault();
      const toggleAction = isSearchOpen ? closeSearch : openSearch;
      toggleAction();
      return true;
    }

    function handleEscapeKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }

      if (isSearchOpen) {
        closeSearch();
      } else if (isDrawerOpen) {
        closeDrawer();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (handleSearchShortcut(event)) {
        return;
      }
      handleEscapeKey(event);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isSearchOpen, openSearch, closeSearch, closeDrawer]);

  // Prevent body scroll when drawer or search is open
  useEffect(() => {
    if (isDrawerOpen || isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, isSearchOpen]);

  const value = useMemo(
    () => ({
      isDrawerOpen,
      isSearchOpen,
      isHeaderCollapsed,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      openSearch,
      closeSearch,
    }),
    [
      isDrawerOpen,
      isSearchOpen,
      isHeaderCollapsed,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      openSearch,
      closeSearch,
    ],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/**
 * Hook to access navigation context
 */
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
