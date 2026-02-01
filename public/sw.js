const CACHE_NAME = 'flagtest-v1.2.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// Network-First strategy for core files, Cache-First for everything else (images/flags)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is index.html or version.json - use endsWith to handle subfolders
  const isIndex = url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('version.json');

  if (isIndex) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
