/**
 * Family Recipes Service Worker
 *
 * Provides offline support and caching for the PWA.
 * Navigations are network-first so deploys never leave clients on stale HTML
 * that references missing /_next/static chunks (client-side exceptions).
 */

/** @file Service Worker for Family Recipes PWA */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `family-recipes-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `family-recipes-dynamic-${CACHE_VERSION}`;
const RECIPE_CACHE = `family-recipes-recipes-${CACHE_VERSION}`;

/** Only immutable / rarely changing assets — never HTML app shells */
const PRECACHE_ASSETS = ['/manifest.json'];

/** Cache duration limits */
const MAX_CACHE_ITEMS = 50;

/** HTTP status for generated offline fallback */
const HTTP_OK = 200;

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
 * Activate event - clean up old caches (including prior versions).
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(async (cacheNames) => {
        const activeCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, RECIPE_CACHE]);
        const oldCaches = cacheNames.filter(
          (name) => name.startsWith('family-recipes-') && !activeCaches.has(name),
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
 * True for top-level document navigations (HTML).
 */
function isNavigationRequest(request) {
  if (request.mode === 'navigate') {
    return true;
  }

  const accept = request.headers.get('accept');
  return Boolean(accept?.includes('text/html'));
}

/**
 * Minimal offline document when the network and cache both fail.
 */
function offlineFallbackResponse() {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Offline — Family Recipes</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #FBF6E3; color: #4A3728;
      display: flex; min-height: 100vh; align-items: center; justify-content: center;
      margin: 0; padding: 1.5rem; text-align: center; }
    button { margin-top: 1rem; padding: 0.75rem 1.25rem; border: 0; border-radius: 0.5rem;
      background: #FED4D9; color: #4A3728; font: inherit; font-weight: 600; }
  </style>
</head>
<body>
  <div>
    <h1>You're offline</h1>
    <p>Reconnect and reload to get the latest Family Recipes.</p>
    <button type="button" onclick="location.reload()">Reload</button>
  </div>
</body>
</html>`;

  return new Response(body, {
    status: HTTP_OK,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Network-first strategy with cache fallback.
 * Used for HTML navigations, APIs, and recipes so deploys stay fresh.
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
    if (isNavigationRequest(request)) {
      return offlineFallbackResponse();
    }
    throw new Error('No cached response available');
  }
}

/**
 * Cache-first strategy with network fallback.
 * Good for hashed static assets that rarely change.
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
 * Fetch event - apply caching strategies.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  if (url.origin !== location.origin) {
    return;
  }

  // HTML navigations must prefer network so deploys are not stuck on stale shells
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  if (isRecipeRequest(url)) {
    event.respondWith(networkFirst(event.request, RECIPE_CACHE));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
});

/**
 * Handle messages from the client.
 */
self.addEventListener('message', (event) => {
  const data = event.data;

  if (data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'CACHE_RECIPE' && typeof data.url === 'string') {
    const recipeUrl = data.url;
    caches.open(RECIPE_CACHE).then((cache) => {
      fetch(recipeUrl).then((response) => {
        if (response.ok) {
          cache.put(recipeUrl, response);
        }
      });
    });
    return;
  }

  if (data.type === 'CLEAR_CACHE') {
    caches.keys().then(async (names) => {
      const familyRecipesCaches = names.filter((name) => name.startsWith('family-recipes-'));
      for (const name of familyRecipesCaches) {
        await caches.delete(name);
      }
    });
  }
});
