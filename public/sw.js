/**
 * Family Recipes Service Worker
 *
 * Provides offline support and caching for the PWA.
 */

/** @file Service Worker for Family Recipes PWA */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `family-recipes-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `family-recipes-dynamic-${CACHE_VERSION}`;
const RECIPE_CACHE = `family-recipes-recipes-${CACHE_VERSION}`;

/** Static assets to precache on install */
const PRECACHE_ASSETS = ['/', '/recipes', '/shopping-list', '/manifest.json'];

/** Cache duration limits */
const MAX_CACHE_ITEMS = 50;

/**
 * Limit cache size by removing oldest entries.
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

/**
 * Install event - precache static assets.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // biome-ignore lint/suspicious/noConsole: SW debugging requires console
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

/**
 * Activate event - clean up old caches.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(async (cacheNames) => {
        const oldCaches = cacheNames.filter(
          (name) =>
            name.startsWith('family-recipes-') &&
            name !== STATIC_CACHE &&
            name !== DYNAMIC_CACHE &&
            name !== RECIPE_CACHE,
        );
        for (const name of oldCaches) {
          // biome-ignore lint/suspicious/noConsole: SW debugging requires console
          console.log('[SW] Deleting old cache:', name);
          await caches.delete(name);
        }
      })
      .then(() => self.clients.claim()),
  );
});

/**
 * Check if a request is for a recipe page or API.
 */
function isRecipeRequest(url) {
  return url.pathname.startsWith('/recipes/') || url.pathname.startsWith('/api/recipes/');
}

/**
 * Check if a request is for the API.
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Check if a request is for a static asset.
 */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  );
}

/**
 * Network-first strategy with cache fallback.
 * Good for dynamic content that should be fresh but available offline.
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw new Error('No cached response available');
  }
}

/**
 * Cache-first strategy with network fallback.
 * Good for static assets that rarely change.
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      limitCacheSize(cacheName, MAX_CACHE_ITEMS);
    }
    return networkResponse;
  } catch {
    // For images, return a placeholder
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#FED4D9" width="200" height="200"/><text x="50%" y="50%" fill="#8B5E5E" text-anchor="middle" dy=".3em" font-family="system-ui">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } },
      );
    }
    throw new Error('No cached response available');
  }
}

/**
 * Stale-while-revalidate strategy.
 * Returns cache immediately while updating in background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

/**
 * Fetch event - apply caching strategies.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Recipe pages and API - network first for freshness
  if (isRecipeRequest(url)) {
    event.respondWith(networkFirst(event.request, RECIPE_CACHE));
    return;
  }

  // Other API requests - network first
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  // Static assets - cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Navigation and other requests - stale while revalidate
  event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE));
});

/**
 * Handle messages from the client.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  // Handle cache refresh requests
  if (event.data.type === 'CACHE_RECIPE') {
    const url = event.data.url;
    caches.open(RECIPE_CACHE).then((cache) => {
      fetch(url).then((response) => {
        if (response.ok) {
          cache.put(url, response);
        }
      });
    });
  }

  // Handle cache clear requests
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(async (names) => {
      const familyRecipesCaches = names.filter((name) => name.startsWith('family-recipes-'));
      for (const name of familyRecipesCaches) {
        await caches.delete(name);
      }
    });
  }
});
