'use client';

/**
 * PWA Provider Component
 *
 * Handles service worker registration and PWA lifecycle events.
 * Wrap your app with this component to enable PWA functionality.
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { registerServiceWorker, skipWaiting } from '@/lib/pwa/register-sw';

interface PWAContextValue {
  /** Whether app is online */
  isOnline: boolean;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether SW is ready */
  isReady: boolean;
  /** Apply pending update */
  applyUpdate: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isOnline: true,
  updateAvailable: false,
  isReady: false,
  applyUpdate: () => {},
});

export function usePWA(): PWAContextValue {
  return useContext(PWAContext);
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps): ReactNode {
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const cleanup = registerServiceWorker({
      onReady: () => {
        setIsReady(true);
      },
      onUpdate: () => {
        setUpdateAvailable(true);
      },
      onError: () => {
        // Error handling is done silently - could add toast notification here
      },
      onOnline: () => {
        setIsOnline(true);
      },
      onOffline: () => {
        setIsOnline(false);
      },
    });

    return cleanup;
  }, []);

  const applyUpdate = () => {
    skipWaiting();
    window.location.reload();
  };

  return (
    <PWAContext.Provider value={{ isOnline, updateAvailable, isReady, applyUpdate }}>
      {children}
    </PWAContext.Provider>
  );
}
