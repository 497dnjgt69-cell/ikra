const CACHE = "ikra-v1.5.0";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ikra-icon-v2-32.png",
  "./ikra-icon-v2-180.png",
  "./ikra-icon-v2-192.png",
  "./ikra-icon-v2-512.png",
  "./ikra-icon-v2-maskable-512.png",
  "./css/ambient.css",
  "./css/base.css",
  "./css/glass.css",
  "./css/mobile.css",
  "./css/nature.css",
  "./css/release-notes.css",
  "./css/workspace.css",
  "./js/app.js",
  "./js/bootstrap.js",
  "./js/config/features.js",
  "./js/config/places.js",
  "./js/controllers/backup.js",
  "./js/controllers/manual-session.js",
  "./js/controllers/planner.js",
  "./js/controllers/prayer-times.js",
  "./js/controllers/settings.js",
  "./js/controllers/statistics.js",
  "./js/controllers/timer.js",
  "./js/core/activity-insights.js",
  "./js/core/anki.js",
  "./js/core/application.js",
  "./js/core/backup-snapshot.js",
  "./js/core/backup-validation.js",
  "./js/core/default-state.js",
  "./js/core/focus-streak.js",
  "./js/core/statistics.js",
  "./js/domain/focus-timer.js",
  "./js/domain/prayer-timer.js",
  "./js/domain/prayer-times.js",
  "./js/domain/subjects.js",
  "./js/features/about.js",
  "./js/features/ambient-sounds.js",
  "./js/features/audio.js",
  "./js/features/focus-room.js",
  "./js/features/prayer-reflections.js",
  "./js/features/prayer-settings.js",
  "./js/features/release-notes.js",
  "./js/features/settings.js",
  "./js/i18n/bindings.js",
  "./js/i18n/dictionary.js",
  "./js/i18n/dom-translator.js",
  "./js/platform/anki-connect.js",
  "./js/platform/commerce.js",
  "./js/platform/prayer-api.js",
  "./js/platform/register-service-worker.js",
  "./js/services/access.js",
  "./js/services/ambient-audio.js",
  "./js/services/backup.js",
  "./js/services/focus-timer.js",
  "./js/services/planner.js",
  "./js/services/prayer-timer.js",
  "./js/services/prayer-times.js",
  "./js/services/records.js",
  "./js/services/settings.js",
  "./js/services/store.js",
  "./js/shared/actions.js",
  "./js/shared/dom.js",
  "./js/shared/format.js",
  "./js/ui/activity-insights.js",
  "./js/ui/animations.js",
  "./js/ui/anki.js",
  "./js/ui/clock.js",
  "./js/ui/mobile-widgets.js",
  "./js/ui/notifications.js",
  "./js/ui/planner.js",
  "./js/ui/prayer-controls.js",
  "./js/ui/prayer-layout.js",
  "./js/ui/prayer-picker.js",
  "./js/ui/prayer.js",
  "./js/ui/progress-widget.js",
  "./js/ui/session-layout.js",
  "./js/ui/statistics.js",
  "./js/ui/time-pickers.js",
  "./js/ui/timer.js",
  "./js/ui/tooltips.js",
  "./js/ui/workspace.js"
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

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.endsWith(".mp3")) {
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
