// Lift Log service worker: caches the app so it works offline.
// The publish workflow fills in VERSION on each deploy, so every deploy gets a fresh cache.
const VERSION = "__BUILD__";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "js/version.js", "vendor/chart.umd.min.js",
  "js/ui.js", "js/state.js", "js/backup.js", "js/log.js",
  "js/equipment.js", "js/entries.js", "js/exercise-library.js", "js/catalog.js",
  "js/search.js", "js/progress.js", "js/plan.js", "js/exercise-sheet.js",
  "js/plan-editor.js", "js/standards.js", "js/main.js",
  "fonts/archivo-latin-wdth-normal.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];
// A new version downloads in the background and then waits, so an open app never mixes old and new files.
// It takes over when the app is fully closed, or when you tap Reload on the "new version" note.
self.addEventListener("install", e => {
  // cache: "reload" skips the browser's own cache, so a new version never stores stale copies.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // Everything, the page included, comes from this version's own cache; the network is only a fallback.
  const page = e.request.mode === "navigate";
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = page ? (await c.match(e.request, { ignoreSearch: true })) || (await c.match("index.html")) : await c.match(e.request);
    if (hit) return hit;
    const r = await fetch(e.request);
    if (page && r.ok) c.put("index.html", r.clone());
    return r;
  }));
});

// Tapping a rest-timer notification brings the app back to the front.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(cs => {
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./");
  }));
});
