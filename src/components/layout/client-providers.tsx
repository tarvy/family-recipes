'use client';

/**
 * Client Providers Component
 *
 * Wraps the app with client-side providers (PWA, navigation, etc.)
 */

import type { ReactNode } from 'react';
import { NavigationProvider } from '@/components/navigation';
import { OfflineIndicator, PWAProvider, UpdatePrompt } from '@/components/pwa';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps): ReactNode {
  return (
    <PWAProvider>
      <NavigationProvider>
        {children}
        <OfflineIndicator />
        <UpdatePrompt />
      </NavigationProvider>
    </PWAProvider>
  );
}
