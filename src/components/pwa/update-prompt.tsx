'use client';

/**
 * Update Prompt Component
 *
 * Shows a banner when a new version of the app is available.
 */

import type { ReactNode } from 'react';
import { usePWA } from './pwa-provider';

export function UpdatePrompt(): ReactNode {
  const { updateAvailable, applyUpdate } = usePWA();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-sunny px-4 py-3 shadow-lg">
      <span className="text-sm text-cocoa">A new version is available!</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="rounded-lg bg-cocoa px-4 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-cocoa/90"
      >
        Update Now
      </button>
    </div>
  );
}
