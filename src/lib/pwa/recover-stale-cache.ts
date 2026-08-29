/**
 * Stale PWA Cache Recovery
 *
 * Detects Next.js chunk / module load failures caused by a service worker
 * serving HTML from a previous deploy, then clears same-origin caches and
 * reloads once per tab session.
 */

/** sessionStorage flag to prevent infinite reload loops */
export const STALE_CACHE_RECOVERY_FLAG = 'family-recipes-stale-cache-recovery';

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk [\w/-]+ failed/i,
  /ChunkLoadError/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
] as const;

/**
 * Whether an error looks like a Next.js / bundler chunk load failure.
 */
export function isStaleChunkError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);
  const combined = `${name} ${message}`;

  if (name === 'ChunkLoadError') {
    return true;
  }

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Clear Cache Storage entries for this origin.
 */
export async function clearFamilyRecipesCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }

  const names = await caches.keys();
  const familyRecipesCaches = names.filter((name) => name.startsWith('family-recipes-'));
  await Promise.all(familyRecipesCaches.map((name) => caches.delete(name)));
}

/**
 * Ask the active service worker to clear caches, then clear from the page too.
 */
export async function requestCacheClear(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const controller = navigator.serviceWorker.controller;
    controller?.postMessage({ type: 'CLEAR_CACHE' });
  }

  await clearFamilyRecipesCaches();
}

interface RecoverOptions {
  /** Injected reload for tests */
  reload?: () => void;
  /** Injected sessionStorage for tests */
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

/**
 * If this looks like a stale-chunk failure and we have not already recovered
 * in this tab session, clear caches and reload once.
 *
 * @returns true when recovery was triggered
 */
export async function recoverFromStaleChunkError(
  error: unknown,
  options: RecoverOptions = {},
): Promise<boolean> {
  if (!isStaleChunkError(error)) {
    return false;
  }

  const storage =
    options.storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
  if (!storage) {
    return false;
  }

  if (storage.getItem(STALE_CACHE_RECOVERY_FLAG) === '1') {
    return false;
  }

  storage.setItem(STALE_CACHE_RECOVERY_FLAG, '1');
  await requestCacheClear();

  const reload =
    options.reload ??
    (() => {
      window.location.reload();
    });
  reload();
  return true;
}

/**
 * Install window listeners that auto-recover from chunk load failures.
 *
 * @returns cleanup function
 */
export function installStaleCacheRecovery(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onError = (event: ErrorEvent): void => {
    recoverFromStaleChunkError(event.error ?? event.message).catch(() => undefined);
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    recoverFromStaleChunkError(event.reason).catch(() => undefined);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
