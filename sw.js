const CACHE = 'mizan-127934f0fa';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
// no-cache: a new worker must store the new files, never a copy the browser kept for a few minutes
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'no-cache'})))
  .then(() => c.put('./version', new Response(JSON.stringify({code: '127934f0fa', at: Date.now()}), {headers: {'Content-Type': 'application/json'}})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('mizan-guides-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Cache first, so the app opens at once even on a weak signal. A new version comes as a new worker (the cache name
// changes with every build); the page offers to open it once it takes over.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Exercise drawings the user downloads are kept by the app in its own cache (mizan-guides-*), not here.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/tools/vendor/workout-guide/')) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req, {ignoreSearch: req.mode === 'navigate'}).then(hit => hit || fetch(req)
    .then(r => { if (r.ok) c.put(req, r.clone()); return r; })
    .catch(() => c.match('./index.html')))));
});
