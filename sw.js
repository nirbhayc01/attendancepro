const CACHE_NAME = "attendance-pro-v20-fix";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"
];

self.addEventListener("install", (e) => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keyList) => Promise.all(keyList.map((key) => {
    if (key !== CACHE_NAME) return caches.delete(key);
  }))));
  return self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // CRITICAL FIX: Ignore Database requests so they don't fail offline
  if (e.request.url.includes("supabase.co") || 
      e.request.url.includes("firebase") || 
      e.request.url.includes("googleapis") || 
      e.request.url.includes("firestore")) {
      return; 
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful network requests
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(e.request);
      })
  );
});
// Handle Push Notifications
self.addEventListener('push', function(event) {
    if (!event.data) return;

    const data = event.data.json();
    
    // Force GitHub Pages to find the exact absolute path for the images
    const iconUrl = new URL('icon.png', self.location).href;
    const badgeUrl = new URL('badge.png', self.location).href;

    const options = {
        body: data.body,
        icon: iconUrl,             // The large colorful icon in the drawer
        badge: badgeUrl,           // The tiny transparent/white icon in the status bar
        vibrate: [200, 100, 200],
        data: { url: self.registration.scope } // Opens the app when tapped
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
// Handle Notification Clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
