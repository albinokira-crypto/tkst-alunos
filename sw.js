const CACHE_NAME = 'tkst-alunos-v78';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/css/main.css?v=78',
  './assets/css/components.css?v=78',
  './assets/js/auth.js?v=78',
  './assets/js/data-curriculum.js?v=78',
  './assets/js/data-katas.js?v=78',
  './assets/js/data-kumite.js?v=78',
  './assets/js/data-glossary.js?v=78',
  './assets/js/data-quiz.js?v=78',
  './assets/js/app.js?v=78',
  './assets/images/logo-tkst.png',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/icon-maskable.png',
  './assets/images/apple-touch-icon.png',
  './assets/images/tigre.png',
  './assets/images/faixas/quimono-branca.svg',
  './assets/images/faixas/quimono-amarela.svg',
  './assets/images/faixas/quimono-vermelha.svg',
  './assets/images/faixas/quimono-laranja.svg',
  './assets/images/faixas/quimono-verde.svg',
  './assets/images/faixas/quimono-roxa.svg',
  './assets/images/faixas/quimono-marrom.svg',
  './assets/images/faixas/quimono-preta.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('SW cache.addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass cache for Cloud Sync API, external videos and non-GET requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('api.restful-api.dev') || 
      event.request.url.includes('youtube.com') || 
      event.request.url.includes('vimeo.com') ||
      event.request.url.includes('cloudflare.com')) {
    return event.respondWith(fetch(event.request));
  }

  // Network-First for navigation / HTML so mobile phones always get the latest layout
  if (event.request.mode === 'navigate' || event.request.url.endsWith('/') || event.request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First with Network Fallback & Update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
