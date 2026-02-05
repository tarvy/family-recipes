'use client';

/**
 * Client Providers Component
 *
 * Wraps the app with client-side providers (PWA, navigation, cooking session, etc.)
 */

import type { ReactNode } from 'react';
import { CookingSessionPanel, CookingSessionProvider } from '@/components/cooking-session';
import { NavigationProvider } from '@/components/navigation';
import { OfflineIndicator, PWAProvider, UpdatePrompt } from '@/components/pwa';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps): ReactNode {
  return (
    <PWAProvider>
      <NavigationProvider>
        <CookingSessionProvider>
          {children}
          <CookingSessionPanel />
          <OfflineIndicator />
          <UpdatePrompt />
        </CookingSessionProvider>
      </NavigationProvider>
    </PWAProvider>
  );
}
