'use client';

/**
 * Main Layout Component
 *
 * Shared layout wrapper that includes the header, navigation drawer,
 * and search modal. Provides consistent navigation across all pages.
 * Offsets main content for header height + iOS safe-area inset.
 */

import type { ReactNode } from 'react';
import { useEdgeSwipe } from '@/components/gestures';
import { Header, NavDrawer, SearchModal, useNavigation } from '@/components/navigation';

interface MainLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Additional class name for the main content area */
  className?: string;
  isFamily?: boolean;
}

/**
 * Main layout wrapper with navigation
 */
export function MainLayout({ children, className = '', isFamily = true }: MainLayoutProps) {
  const { openDrawer } = useNavigation();

  // Enable edge swipe to open drawer (mobile only)
  useEdgeSwipe({
    onSwipe: openDrawer,
    enabled: true,
  });

  return (
    <>
      <Header isFamily={isFamily} />
      <NavDrawer isFamily={isFamily} />
      <SearchModal />

      {/* Main content with header + safe-area offset */}
      <main className={`header-offset min-h-screen ${className}`}>{children}</main>
    </>
  );
}
