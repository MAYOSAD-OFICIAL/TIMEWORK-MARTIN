const SW_VERSION = 'tw-sw-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;
const DYNAMIC_CACHE = `${SW_VERSION}-dyn`;
const API_CACHE = `${SW_VERSION}-api`;

// lista mínima de recursos a cachear (ajusta si cambias nombres)
const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(k)) return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  const req = evt.request;
  const url = new URL(req.url);

  // 1) Si es una petición a la API (script.google.com macors), hacer network-first y cache respuesta
  if (url.hostname.includes('script.google.com') || url.pathname.endsWith('/exec')) {
    evt.respondWith(
      fetch(req)
        .then(res => {
          // clone y guarda en cache API
          const copy = res.clone();
          caches.open(API_CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(_ => {
          // fallback : usar última respuesta cacheada si existe
          return caches.match(req).then(cached => cached || new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } }));
        })
    );
    return;
  }

  // 2) Archivos estáticos -> cache-first
  if (STATIC_FILES.some(path => req.url.endsWith(path) || req.url === location.origin + '/' )) {
    evt.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(net => {
        return caches.open(DYNAMIC_CACHE).then(cache => { cache.put(req, net.clone()); return net; });
      }))
    );
    return;
  }

  // 3) Otros requests -> network-first, con fallback a cache
  evt.respondWith(
    fetch(req).then(res => {
      return caches.open(DYNAMIC_CACHE).then(cache => { cache.put(req, res.clone()); return res; });
    }).catch(_ => caches.match(req))
  );
});
