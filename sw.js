// TII Document Control — Service Worker
// App-shell dicache saat install supaya bisa dibuka tanpa internet.
// Panggilan API (Apps Script) memakai strategi network-first dengan fallback ke cache.

const SHELL_CACHE = 'tii-shell-v1';
const API_CACHE = 'tii-api-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apps Script API calls -> network-first, fallback to last cached response
  if (url.href.includes('script.google.com')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (req.method === 'GET') {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // App shell -> cache-first
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
    );
  }
});
