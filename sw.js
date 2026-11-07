/* Cache only the static application. Third-party media is never downloaded here. */
const VERSION = "radio-anime-v2.1.0";
const scope = new URL("./", self.location.href);
const files = [
  "./",
  "index.html",
  "style.css?v=2.1.0",
  "script.js?v=2.1.0",
  "config.js?v=2.1.0",
  "assets/rooftop.png",
  "assets/favicon.svg",
  "assets/manrope-regular.ttf",
  "assets/manrope-bold.ttf",
  "data/selection.json",
  "manifest.webmanifest",
];
const allowed = new Set(files.map((file) => new URL(file, scope).href));
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        cache.addAll(files.map((file) => new URL(file, scope).href)),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("radio-anime-") && key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname))
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(new URL("index.html", scope).href),
      ),
    );
  } else if (allowed.has(url.href)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches
                .open(VERSION)
                .then((cache) => cache.put(event.request, clone)),
            );
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
  }
});
