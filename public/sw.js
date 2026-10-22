const V = "ludotheque-v3";
const FILES = ["./", "index.html", "html5-qrcode.min.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== V).map(n => caches.delete(n))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.includes("/api/") || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
    if (n.ok && u.pathname.includes("/tess/")) { const c = n.clone(); caches.open(V).then(ch => ch.put(e.request, c)); }
    return n;
  })));
});
