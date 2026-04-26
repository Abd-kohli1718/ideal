self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A simple pass-through service worker to satisfy PWA installation requirements.
  event.respondWith(fetch(event.request));
});
