// Minimal, reliability-first Service Worker
// Goal: keep the site loading reliably (especially on mobile), avoid stale bundle issues.

const CACHE_VERSION = 'triviabees-v8';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = [
  '/fallback.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith('triviabees-') && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        );
      } catch {
        // ignore
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // For navigations (SPA routes), try network first; if offline, show fallback.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/fallback.html');
        return (
          cached ||
          new Response('<!doctype html><html><body><h1>Offline</h1></body></html>', {
            headers: { 'Content-Type': 'text/html' },
          })
        );
      })
    );
    return;
  }

  // Everything else: pass-through (no caching, no synthetic offline responses)
  event.respondWith(fetch(request));
});

// Push notifications (keep existing functionality)
self.addEventListener('push', (event) => {
  let data = { title: 'New Message', body: 'You have a new message', icon: '/favicon.ico' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      // ignore
    }
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
      for (const c of clients) {
        if (c.url === '/' && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
