'use client';

/**
 * Header Component
 *
 * Responsive header with hamburger menu (mobile) and inline links (desktop).
 * Folds/collapses when scrolling down, expands when scrolling up.
 */

import Link from 'next/link';
import { HEADER_HEIGHT_PX, NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useNavigation } from './header-context';
import { NAV_LINKS, NavLinkItem } from './nav-links';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;
/** Icon sizes in pixels */
const ICON_SIZE_SM_PX = 20;
const ICON_SIZE_MD_PX = 24;

/**
 * Main header component
 */
export function Header() {
  const { isHeaderCollapsed, openDrawer, openSearch } = useNavigation();

  return (
    <header
      className="fixed left-0 right-0 top-0 bg-pink shadow-sm transition-transform"
      style={{
        height: HEADER_HEIGHT_PX,
        zIndex: NAV_Z_INDEX.header,
        transform: isHeaderCollapsed ? `translateY(-${HEADER_HEIGHT_PX}px)` : 'translateY(0)',
        transitionDuration: 'var(--duration-normal, 300ms)',
        transitionTimingFunction: 'var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))',
      }}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        {/* Left side: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu - mobile only */}
          <button
            type="button"
            onClick={openDrawer}
            className="rounded-lg p-2 text-foreground hover:bg-pink-dark/20 md:hidden"
            aria-label="Open navigation menu"
          >
            <HamburgerIcon className="h-6 w-6" size={ICON_SIZE_MD_PX} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">Family Recipes</span>
          </Link>
        </div>

        {/* Center: desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLinkItem key={link.href} link={link} variant="header" />
          ))}
        </nav>

        {/* Right side: search */}
        <button
          type="button"
          onClick={openSearch}
          className="rounded-lg p-2 text-foreground hover:bg-pink-dark/20"
          aria-label="Open search"
        >
          <SearchIcon className="h-5 w-5" size={ICON_SIZE_SM_PX} />
        </button>
      </div>
    </header>
  );
}

/**
 * Hamburger menu icon
 */
function HamburgerIcon({
  className,
  size = ICON_SIZE_MD_PX,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

/**
 * Search icon
 */
function SearchIcon({ className, size = ICON_SIZE_SM_PX }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
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
