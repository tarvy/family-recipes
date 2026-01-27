/**
 * Service Worker Registration
 *
 * Handles service worker lifecycle for PWA functionality.
 */

/** Check if service workers are supported */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/** Service worker registration options */
export interface RegisterSWOptions {
  /** Called when SW is ready */
  onReady?: (registration: ServiceWorkerRegistration) => void;
  /** Called when a new SW is installed (update available) */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Called on registration error */
  onError?: (error: Error) => void;
  /** Called when offline */
  onOffline?: () => void;
  /** Called when back online */
  onOnline?: () => void;
}

/**
 * Register the service worker.
 *
 * @param options - Registration callbacks
 * @returns Cleanup function
 */
export function registerServiceWorker(options: RegisterSWOptions = {}): () => void {
  const { onReady, onUpdate, onError, onOffline, onOnline } = options;

  if (!isServiceWorkerSupported()) {
    return () => {};
  }

  // Handle online/offline events
  const handleOnline = () => onOnline?.();
  const handleOffline = () => onOffline?.();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Register service worker
  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      // Check if there's an update available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              onUpdate?.(registration);
            }
          });
        }
      });

      // SW is ready
      if (registration.active) {
        onReady?.(registration);
      } else {
        registration.addEventListener('activate', () => {
          onReady?.(registration);
        });
      }
    })
    .catch((error) => {
      onError?.(error);
    });

  // Cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Request the service worker to skip waiting and activate.
 * Useful when prompting user to update.
 */
export function skipWaiting(): void {
  if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('skipWaiting');
  }
}

/**
 * Request the service worker to cache a specific recipe.
 *
 * @param recipeUrl - URL of the recipe to cache
 */
export function cacheRecipe(recipeUrl: string): void {
  if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_RECIPE',
      url: recipeUrl,
    });
  }
}

/**
 * Request the service worker to clear all caches.
 */
export function clearCache(): void {
  if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE',
    });
  }
}
