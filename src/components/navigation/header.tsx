'use client';

/**
 * Header Component
 *
 * Responsive header with hamburger menu (mobile) and inline links (desktop).
 * Folds/collapses when scrolling down, expands when scrolling up.
 * Pads safe-area-inset-top for iPhone notch / Dynamic Island / PWA.
 */

import Link from 'next/link';
import { HEADER_HEIGHT_PX, NAV_Z_INDEX } from '@/lib/constants/navigation';
import { useNavigation } from './header-context';
import { getFilteredNavLinks, NavLinkItem } from './nav-links';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;
/** Icon sizes in pixels */
const ICON_SIZE_SM_PX = 20;
const ICON_SIZE_MD_PX = 24;

/**
 * Main header component
 */
export function Header({ isFamily = true }: { isFamily?: boolean }) {
  const { isHeaderCollapsed, openDrawer, openSearch } = useNavigation();
  const navLinks = getFilteredNavLinks(isFamily);

  return (
    <header
      className="fixed left-0 right-0 top-0 bg-pink pt-safe shadow-sm transition-transform"
      style={{
        zIndex: NAV_Z_INDEX.header,
        // Content row is HEADER_HEIGHT_PX; total painted height includes safe-area via pt-safe
        height: `calc(${HEADER_HEIGHT_PX}px + env(safe-area-inset-top, 0px))`,
        transform: isHeaderCollapsed
          ? `translateY(calc(-1 * (${HEADER_HEIGHT_PX}px + env(safe-area-inset-top, 0px))))`
          : 'translateY(0)',
        transitionDuration: 'var(--duration-normal, 300ms)',
        transitionTimingFunction: 'var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))',
      }}
    >
      <div
        className="mx-auto flex max-w-6xl items-center justify-between px-4"
        style={{ height: HEADER_HEIGHT_PX }}
      >
        {/* Left side: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu - mobile only */}
          <button
            type="button"
            onClick={openDrawer}
            className="flex size-touch items-center justify-center rounded-lg text-foreground hover:bg-pink-dark/20 md:hidden"
            aria-label="Open navigation menu"
          >
            <HamburgerIcon className="h-6 w-6" size={ICON_SIZE_MD_PX} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex min-h-touch items-center gap-2">
            <span className="text-lg font-bold text-foreground">Family Recipes</span>
          </Link>
        </div>

        {/* Center: desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <NavLinkItem key={link.href} link={link} variant="header" />
          ))}
        </nav>

        {/* Right side: search */}
        <button
          type="button"
          onClick={openSearch}
          className="flex size-touch items-center justify-center rounded-lg text-foreground hover:bg-pink-dark/20"
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
