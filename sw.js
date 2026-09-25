// Lets the app open without internet (e.g. no signal at the pitch).
// Always tries the network first so updates arrive straight away; if that
// fails or takes over 3 seconds, it uses the copy saved on the phone.

const CACHE = 'substitutor-v1';
const FILES = [
  './',
  './index.html',
  './style.css',
  './js/app.js',
  './js/match.js',
  './js/storage.js',
  './js/alerts.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
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

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(fromNetworkOrCache(request));
});

async function fromNetworkOrCache(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {
    // Offline: fall through to the saved copy.
  }
  const saved = await cache.match(request, { ignoreSearch: true })
    ?? (request.mode === 'navigate' ? await cache.match('./index.html') : undefined);
  return saved ?? network;
}
