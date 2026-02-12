const CACHE_NAME = 'immoflow-v2';
const API_CACHE_NAME = 'immoflow-api-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json'
];

const API_CACHE_ROUTES = [
  '/api/properties',
  '/api/units',
  '/api/tenants',
  '/api/damage-reports/stats',
  '/api/esg/dashboard',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_ROUTES.some(r => url.pathname.startsWith(r));
    if (shouldCache) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    }
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'ImmoflowMe', body: 'Neue Benachrichtigung', icon: '/favicon.png' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'immoflow-notification',
    data: data.url ? { url: data.url } : {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.urgent || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearApiCache') {
    caches.delete(API_CACHE_NAME);
  }
});
