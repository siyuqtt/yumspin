const CACHE_NAME = 'yumspin-v6';

const CORE_ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/engine.js',
  './js/audio.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
];

const MEDIA_ASSETS = [
  './assets/images/rice.jpg',
  './assets/images/noodles.jpg',
  './assets/images/pasta.jpg',
  './assets/images/sweet_potato.jpg',
  './assets/images/potato.jpg',
  './assets/images/bread.jpg',
  './assets/images/tortilla.jpg',
  './assets/images/quinoa.jpg',
  './assets/images/gnocchi.jpg',
  './assets/images/rice_cake.jpg',
  './assets/images/broccoli.jpg',
  './assets/images/tomato.jpg',
  './assets/images/spinach.jpg',
  './assets/images/mushroom.jpg',
  './assets/images/carrot.jpg',
  './assets/images/bell_pepper.jpg',
  './assets/images/eggplant.jpg',
  './assets/images/zucchini.jpg',
  './assets/images/bok_choy.jpg',
  './assets/images/asparagus.jpg',
  './assets/images/egg.jpg',
  './assets/images/chicken.jpg',
  './assets/images/tofu.jpg',
  './assets/images/salmon.jpg',
  './assets/images/beef.jpg',
  './assets/images/shrimp.jpg',
  './assets/images/pork.jpg',
  './assets/images/chickpeas.jpg',
  './assets/images/tuna.jpg',
  './assets/images/edamame.jpg',
  './assets/images/steps/step_prep.jpg',
  './assets/images/steps/step_steam.jpg',
  './assets/images/steps/step_broth.jpg',
  './assets/images/steps/step_sear.jpg',
  './assets/images/steps/step_roast.jpg',
  './assets/images/steps/step_sauce.jpg',
  './assets/images/steps/step_plate_bowl.jpg',
  './assets/images/steps/step_plate_dish.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // Warm image cache in background without blocking install
      await Promise.allSettled(MEDIA_ASSETS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Images & icons: cache-first for instant offline rendering
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML / CSS / JS: network-first with offline cache fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  );
});
