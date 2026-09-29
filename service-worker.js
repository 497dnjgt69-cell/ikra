const CACHE = "ikra-v1.1.2";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./css/base.css",
  "./css/glass.css",
  "./css/mobile.css",
  "./css/nature.css",
  "./css/release-notes.css",
  "./css/workspace.css",
  "./js/app.js",
  "./js/core/default-state.js",
  "./js/core/backup-validation.js",
  "./js/features/audio.js",
  "./js/core/application.js",
  "./js/core/backup-snapshot.js",
  "./js/core/statistics.js",
  "./js/features/about.js",
  "./js/features/focus-room.js",
  "./js/features/prayer-reflections.js",
  "./js/features/prayer-settings.js",
  "./js/features/release-notes.js",
  "./js/features/settings.js",
  "./js/i18n/dictionary.js",
  "./js/i18n/dom-translator.js",
  "./js/ui/animations.js",
  "./js/ui/mobile-widgets.js",
  "./js/ui/notifications.js",
  "./js/ui/prayer-controls.js",
  "./js/ui/prayer-layout.js",
  "./js/ui/prayer-picker.js",
  "./js/ui/progress-widget.js",
  "./js/ui/session-layout.js",
  "./js/ui/time-pickers.js",
  "./js/ui/tooltips.js",
  "./js/ui/workspace.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(CORE.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ikra-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return Response.error();
      }),
  );
});
