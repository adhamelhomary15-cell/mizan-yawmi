const CACHE = 'mizan-bade538112';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('mizan-guides-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first, so a new version shows up as soon as the app opens online; the cached copy serves offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Exercise drawings the user downloads are kept by the app in its own cache (mizan-guides-*), not here.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/tools/vendor/workout-guide/')) return;
  e.respondWith(fetch(req, {cache: 'no-cache'})
    .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
});
