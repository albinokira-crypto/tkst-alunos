const CACHE_NAME = 'tkst-alunos-v174';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/css/main.css?v=174',
  './assets/css/components.css?v=174',
  './assets/js/auth.js?v=174',
  './assets/js/data-curriculum.js?v=174',
  './assets/js/data-katas.js?v=174',
  './assets/js/data-kumite.js?v=174',
  './assets/js/data-glossary.js?v=174',
  './assets/js/data-quiz.js?v=174',
  './assets/js/data-exams.js?v=174',
  './assets/js/app.js?v=174',
  './assets/audio/interstellar-ticktock-15s.mp3',
  './assets/images/logo-tkst.png',
  './assets/images/logo-header-tkst.png',
  './assets/images/quadro-citacao-funakoshi.png',
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
  './assets/images/faixas/quimono-preta.svg',
  './assets/images/tecnicas/gyaku-tsuki.png',
  './assets/images/tecnicas/oi-tsuki.svg',
  './assets/images/tecnicas/zenkutsu-dachi.svg',
  './assets/images/tecnicas/kokutsu-dachi.svg',
  './assets/images/tecnicas/kiba-dachi.svg',
  './assets/images/tecnicas/gedan-barai.svg',
  './assets/images/tecnicas/jodan-age-uke.svg',
  './assets/images/tecnicas/mae-geri.svg',
  './assets/images/tecnicas/mawashi-geri.svg',
  './assets/images/tecnicas/yoko-geri.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Bypass cache for Cloud Sync API, student authentication, external videos and non-GET requests
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('ntfy.sh') ||
      event.request.url.includes('github') ||
      event.request.url.includes('assets/data/') ||
      event.request.url.includes('api.restful-api.dev') || 
      event.request.url.includes('youtube.com') || 
      event.request.url.includes('vimeo.com') ||
      event.request.url.includes('cloudflare.com')) {
    return event.respondWith(fetch(event.request));
  }

  // Network-First for ALL assets and navigations: Always fetch freshest files when online, fallback to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
      })
  );
});
