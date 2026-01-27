'use client';

/**
 * Client Providers Component
 *
 * Wraps the app with client-side providers (PWA, etc.)
 */

import type { ReactNode } from 'react';
import { OfflineIndicator, PWAProvider, UpdatePrompt } from '@/components/pwa';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps): ReactNode {
  return (
    <PWAProvider>
      {children}
      <OfflineIndicator />
      <UpdatePrompt />
    </PWAProvider>
  );
}
