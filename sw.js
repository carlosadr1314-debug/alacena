// Service worker: permite abrir la app sin internet (excepto la IA).
// Sube el número de versión cada vez que publiques cambios.
const CACHE = 'alacena-v13';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/premium.js',
  './js/recommend.js',
  './js/store.js',
  './js/engine.js',
  './js/game.js',
  './js/ai.js',
  './js/icons.js',
  './js/data/diets.js',
  './js/data/ingredients.js',
  './js/data/recipes.js',
  './js/data/recipes-extra.js',
  './js/data/recipes-extra2.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Red primero para archivos propios (así ves los cambios), caché si no hay internet.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('generativelanguage.googleapis.com')) return; // IA: siempre red
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
    );
  } else if (url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })),
    );
  }
});
