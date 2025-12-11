// Ultra-optimized Service Worker for 1M+ concurrent users
// Aggressive caching with stale-while-revalidate strategy

const CACHE_VERSION = 'triviabees-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Critical static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/fallback.html',
  '/favicon.ico'
];

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
                        key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET and non-http(s) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Strategy 1: Cache-first for static assets (JS, CSS, images, fonts)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Stale-while-revalidate for API (except auth)
  if (isApiRequest(url) && !url.pathname.includes('/auth/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Strategy 3: Network-first for HTML pages
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(networkWithCacheFallback(request, DYNAMIC_CACHE));
});

// Static asset detection
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(url.pathname) ||
         url.pathname.startsWith('/assets/');
}

// API request detection
function isApiRequest(url) {
  return url.pathname.includes('/rest/') || 
         url.pathname.includes('/functions/') ||
         url.hostname.includes('supabase');
}

// Cache-first (static assets)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate (API calls - instant response, background update)
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Background fetch
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  // Return cached immediately if available
  return cached || fetchPromise;
}

// Network-first with fallback (HTML pages)
async function networkFirstWithFallback(request) {
  try {
    return await fetch(request);
  } catch (e) {
    const fallback = await caches.match('/fallback.html');
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
