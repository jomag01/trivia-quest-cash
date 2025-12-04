// Service Worker for Push Notifications and Performance Caching
const CACHE_NAME = 'gamewin-cache-v1';
const STATIC_CACHE = 'gamewin-static-v1';
const MEDIA_CACHE = 'gamewin-media-v1';

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/placeholder.svg',
  '/favicon.ico'
];

// Cache durations
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  media: 30 * 24 * 60 * 60 * 1000, // 30 days
  api: 5 * 60 * 1000, // 5 minutes
};

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== MEDIA_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Cache First for static/media, Network First for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls and auth
  if (url.hostname.includes('supabase') || url.pathname.includes('/auth/')) {
    return;
  }

  // Media files (images, videos) - Cache First with long expiry
  if (request.destination === 'image' || request.destination === 'video' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|m3u8)$/i)) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Static assets (JS, CSS, fonts) - Cache First
  if (request.destination === 'script' || request.destination === 'style' || 
      request.destination === 'font' || url.pathname.match(/\.(js|css|woff2?)$/i)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network First with fallback
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// Cache First strategy - best for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached and update in background
    updateCache(request, cache);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network First strategy - best for dynamic content
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Background cache update
async function updateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail on background update
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let notificationData = {
    title: "New Message",
    body: "You have a new message",
    icon: "/placeholder.svg",
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error("Error parsing push notification data:", e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: "/placeholder.svg",
      data: notificationData.data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/community");
      }
    })
  );
});