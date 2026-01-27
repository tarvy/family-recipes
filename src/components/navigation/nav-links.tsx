'use client';

/**
 * Navigation Links
 *
 * Shared navigation link definitions and components.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Icon stroke width for consistent styling */
const ICON_STROKE_WIDTH = 2;

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Navigation link definitions
 */
export const NAV_LINKS: NavLink[] = [
  {
    href: '/recipes',
    label: 'Recipes',
    icon: RecipesIcon,
  },
  {
    href: '/shopping-list',
    label: 'Shopping List',
    icon: ShoppingIcon,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
  },
];

interface NavLinkItemProps {
  link: NavLink;
  onClick?: () => void;
  variant?: 'header' | 'drawer';
}

/**
 * Individual navigation link component
 */
export function NavLinkItem({ link, onClick, variant = 'header' }: NavLinkItemProps) {
  const pathname = usePathname();
  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

  // Only pass onClick if it's defined to satisfy exactOptionalPropertyTypes
  const linkProps = onClick ? { onClick } : {};

  if (variant === 'drawer') {
    return (
      <Link
        href={link.href}
        {...linkProps}
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
          isActive ? 'bg-lavender-light text-lavender-dark' : 'text-foreground hover:bg-pink-light'
        }`}
      >
        <link.icon className="h-5 w-5" />
        {link.label}
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      {...linkProps}
      className={`text-sm font-medium transition-colors ${
        isActive ? 'text-lavender-dark' : 'text-foreground hover:text-lavender-dark'
      }`}
    >
      {link.label}
    </Link>
  );
}

/**
 * Recipes icon
 */
function RecipesIcon({ className }: { className?: string }) {
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
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

/**
 * Shopping cart icon
 */
function ShoppingIcon({ className }: { className?: string }) {
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
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

/**
 * Settings gear icon
 */
function SettingsIcon({ className }: { className?: string }) {
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ICON_STROKE_WIDTH}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
