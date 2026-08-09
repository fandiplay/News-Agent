const CACHE_NAME = 'global-news-v1';
const APP_SHELL = [
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const url of APP_SHELL) {
      try {
        await cache.add(url);
      } catch (err) {
        console.warn('Gagal cache:', url, err);
      }
    }

    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      return response;
    } catch (err) {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      throw err;
    }
  })());
});