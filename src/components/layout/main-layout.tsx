'use client';

/**
 * Main Layout Component
 *
 * Shared layout wrapper that includes the header, navigation drawer,
 * and search modal. Provides consistent navigation across all pages.
 */

import type { ReactNode } from 'react';
import { useEdgeSwipe } from '@/components/gestures';
import { Header, NavDrawer, SearchModal, useNavigation } from '@/components/navigation';
import { HEADER_HEIGHT_PX } from '@/lib/constants/navigation';

interface MainLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Additional class name for the main content area */
  className?: string;
}

/**
 * Main layout wrapper with navigation
 */
export function MainLayout({ children, className = '' }: MainLayoutProps) {
  const { openDrawer } = useNavigation();

  // Enable edge swipe to open drawer (mobile only)
  useEdgeSwipe({
    onSwipe: openDrawer,
    enabled: true,
  });

  return (
    <>
      <Header />
      <NavDrawer />
      <SearchModal />

      {/* Main content with header offset */}
      <main className={`min-h-screen ${className}`} style={{ paddingTop: HEADER_HEIGHT_PX }}>
        {children}
      </main>
    </>
  );
}
