// Road to 3/4/5 — offline cache
const C = "r345-v33";
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
    // NETWORK-FIRST for the app page: a fresh open always gets the latest build
    // when online; the cache is only the offline fallback. (Cache-first here
    // meant iOS could sit on a stale build across restarts.)
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) { const cl = res.clone(); caches.open(C).then((c) => c.put("./index.html", cl)); }
        return res;
      }).catch(() => caches.match("./index.html"))
    );
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
