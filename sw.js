const CACHE_NAME = "attendance-pro-v15-pwa";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./icon.png",
    "https://cdn.jsdelivr.net/npm/chart.js"
];

// Install & Cache
self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// Activate & Clean Old Caches
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())
        ))
    );
    return self.clients.claim();
});

// Fetch Strategy: Stale-While-Revalidate
// This loads the page instantly from cache, then updates it in the background.
self.addEventListener("fetch", (e) => {
    // Skip Firebase/Google APIs
    if (e.request.url.includes("firebase") || e.request.url.includes("googleapis")) return;

    e.respondWith(
        caches.match(e.request).then(cachedRes => {
            const fetchPromise = fetch(e.request).then(networkRes => {
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkRes.clone()));
                return networkRes;
            });
            return cachedRes || fetchPromise;
        })
    );
});
