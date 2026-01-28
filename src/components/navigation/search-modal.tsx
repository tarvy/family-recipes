'use client';

/**
 * Search Modal
 *
 * Full-screen search overlay with recipe search functionality.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useNavigation } from './header-context';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;
/** Default icon size in pixels */
const ICON_SIZE_PX = 24;

/** Debounce delay for search input in milliseconds */
const _SEARCH_DEBOUNCE_MS = 300;

/**
 * Search modal component
 */
export function SearchModal() {
  const { isSearchOpen, closeSearch } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Only render portal after client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  /**
   * Handle search form submission
   */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/recipes?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  }

  /**
   * Handle input change
   */
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
  }

  // Don't render until mounted on client AND search is open
  if (!(mounted && isSearchOpen)) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
      style={{
        zIndex: NAV_Z_INDEX.searchModal,
        transitionDuration: 'var(--duration-fast, 150ms)',
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={closeSearch}
        className="absolute right-4 top-4 rounded-lg p-2 text-foreground hover:bg-pink-light"
        aria-label="Close search"
      >
        <CloseIcon className="h-6 w-6" />
      </button>

      {/* Search form */}
      <div className="flex h-full flex-col items-center justify-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <label htmlFor="search-input" className="sr-only">
            Search recipes
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Search recipes..."
              className="w-full rounded-xl border-2 border-border bg-card py-4 pl-14 pr-4 text-xl text-foreground placeholder:text-muted-foreground focus:border-lavender focus:outline-none"
            />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Press Enter to search or Escape to close
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Search icon
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={ICON_SIZE_PX}
      height={ICON_SIZE_PX}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

/**
 * Close (X) icon
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={ICON_SIZE_PX}
      height={ICON_SIZE_PX}
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
