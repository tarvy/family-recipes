'use client';

/**
 * Offline Indicator Component
 *
 * Shows a banner when the user is offline.
 */

import type { ReactNode } from 'react';
import { usePWA } from './pwa-provider';

export function OfflineIndicator(): ReactNode {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-cocoa px-4 py-2 text-center text-sm text-cream">
      You&apos;re offline. Some features may be unavailable.
    </div>
  );
}
