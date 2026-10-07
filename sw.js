// Road to 3/4/5 — offline cache
const C = "r345-v62";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (isPage) {
    // NETWORK FIRST, BUT NEVER STUCK: the network gets 1.5 s to answer; a stalled gym connection gets
    // the cached app instead of a blank screen. The network copy still refreshes the cache in the
    // background, and reg.update() + controllerchange still deliver new builds. (Pure cache-first
    // meant iOS could sit on a stale build across restarts.)
    const net = fetch(e.request).then((res) => {
      if (res.ok) { const cl = res.clone(); caches.open(C).then((c) => c.put("./index.html", cl)); }
      return res;
    });
    e.waitUntil(net.then(() => {}, () => {}));
    e.respondWith(caches.match("./index.html").then((cached) => cached
      ? Promise.race([net.catch(() => cached), new Promise((r) => setTimeout(() => r(cached), 1500))])
      : net));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) =>
      r || fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const cl = res.clone();
          caches.open(C).then((c) => c.put(e.request, cl));
        }
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
