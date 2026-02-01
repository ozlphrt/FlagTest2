self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => caches.delete(key))
    )).then(() => {
      // Specifically unregister itself after clearing cache
      return self.registration.unregister();
    }).then(() => {
      // Ensure all windows are refreshed to pick up the change
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach(client => client.navigate(client.url));
    })
  );
});
