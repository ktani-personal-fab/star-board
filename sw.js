// Offline cache. Bump VERSION on every release; the new files are used from the next launch.
const VERSION = "star-3";
const FILES = ["./", "index.html", "style.css", "glyphs.js", "engine.js", "places.js", "app.js", "star.wasm", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith("star-") && x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || fetch(e.request)));
});
