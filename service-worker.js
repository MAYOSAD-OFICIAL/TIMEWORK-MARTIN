// Bump de versión de caché para forzar refresco de assets
const CACHE_NAME = 'timework-v2';

const FILES = [
  '/',           // raíz (si sirves desde dominio/base)
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Precache en instalación
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// Activación: limpiar cachés antiguas y tomar control
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      )
    ).then(() => self.clients.claim())
  );
});

// Estrategia: cache-first con network fallback
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
