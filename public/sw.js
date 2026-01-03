// Ultra-optimized Service Worker for 100M+ concurrent users
// Features: Aggressive caching, stale-while-revalidate, offline support, request coalescing

const CACHE_VERSION = 'triviabees-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Max cache sizes to prevent storage exhaustion
const MAX_DYNAMIC_CACHE_SIZE = 100;
const MAX_API_CACHE_SIZE = 200;
const MAX_IMAGE_CACHE_SIZE = 500;

// Critical static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/fallback.html',
  '/favicon.ico',
  '/manifest.json',
  '/install'
];

// Request coalescing - prevent duplicate concurrent requests
const pendingRequests = new Map();

// Install: Pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches aggressively
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys
          .filter(key => key.startsWith('triviabees-') && 
                        key !== STATIC_CACHE && 
                        key !== DYNAMIC_CACHE && 
                        key !== API_CACHE &&
                        key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Smart caching strategies with request coalescing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET and non-http(s) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Strategy 1: Stale-while-revalidate for static assets (JS, CSS, fonts)
  // This prevents clients from getting stuck on an old bundle after deployments.
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidateCoalesced(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Optimized image caching with size limits
  if (isImageAsset(url)) {
    event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
    return;
  }

  // Strategy 3: Never cache backend/API responses (user-specific data must be fresh)
  // This prevents admin/rider lists from being stuck on stale cached results.
  if (isBackendRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Strategy 4: Network-first for HTML pages with SPA fallback
  // If hosting ever returns a 404 for deep links (e.g. /feed?tab=games), serve the app shell.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithSpaFallback(request));
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(networkWithCacheFallback(request, DYNAMIC_CACHE));
});

// Static asset detection (excluding images)
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf)$/i.test(url.pathname) ||
         url.pathname.startsWith('/assets/') && !/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(url.pathname);
}

// Image asset detection
function isImageAsset(url) {
  return /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(url.pathname);
}

// Backend request detection (Lovable Cloud API) - never cache
function isBackendRequest(url) {
  return url.pathname.includes('/rest/') ||
         url.pathname.includes('/functions/') ||
         url.pathname.includes('/auth/') ||
         url.hostname.includes('supabase');
}

// Cache-first with size limit (images)
async function cacheFirstWithLimit(request, cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Check cache size and evict if needed
      const keys = await cache.keys();
      if (keys.length >= maxSize) {
        // Remove oldest 20%
        const toRemove = Math.ceil(keys.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
          await cache.delete(keys[i]);
        }
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate with request coalescing (static assets)
async function staleWhileRevalidateCoalesced(request, cacheName) {
  const requestKey = request.url;
  
  // Check if there's already a pending request for this URL
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Create the fetch promise with coalescing
  const fetchPromise = fetch(request).then(async response => {
    pendingRequests.delete(requestKey);
    if (response.ok) {
      // Check cache size
      const keys = await cache.keys();
      if (keys.length >= MAX_API_CACHE_SIZE) {
        const toRemove = Math.ceil(keys.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
          await cache.delete(keys[i]);
        }
      }
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    pendingRequests.delete(requestKey);
    return cached || new Response('Offline', { status: 503 });
  });
  
  // Store pending request for coalescing
  if (!cached) {
    pendingRequests.set(requestKey, fetchPromise);
  }
  
  // Return cached immediately if available
  return cached || fetchPromise;
}

// Network-first with SPA fallback (HTML pages)
async function networkFirstWithSpaFallback(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) return response;

    // If the server responds with a 404 for a deep-link, serve the app shell instead.
    const appShell = await caches.match('/', { ignoreSearch: true });
    if (appShell) return appShell;

    const fallback = await caches.match('/fallback.html', { ignoreSearch: true });
    return fallback || response;
  } catch (e) {
    const appShell = await caches.match('/', { ignoreSearch: true });
    if (appShell) return appShell;

    const fallback = await caches.match('/fallback.html', { ignoreSearch: true });
    return fallback || new Response(
      '<!DOCTYPE html><html><body><h1>Offline</h1></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Network with cache fallback
async function networkWithCacheFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return await caches.match(request) || new Response('Offline', { status: 503 });
  }
}

// Push notifications (unchanged functionality)
self.addEventListener('push', (event) => {
  let data = { title: 'New Message', body: 'You have a new message', icon: '/favicon.ico' };
  
  if (event.data) {
    try { data = event.data.json(); } catch (e) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/favicon.ico',
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (let c of clients) {
        if (c.url === '/' && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
