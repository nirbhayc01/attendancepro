const CACHE_NAME = "attendance-pro-v21-modular";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  ".assets/icon.png",
  ".assets/badge.png",
  "./js/core.js",
  "./js/ui.js",
  "./js/onboarding.js",
  "./js/attendance.js",
  "./js/settings.js",
  "./js/features.js",
  "./js/app.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
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
  // Skip database / auth requests — must always go to network
  if (e.request.url.includes("supabase.co") ||
      e.request.url.includes("firebase")    ||
      e.request.url.includes("googleapis")  ||
      e.request.url.includes("firestore")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Handle Push Notifications
self.addEventListener('push', function (event) {
  if (!event.data) return;
  const data     = event.data.json();
  const iconUrl  = new URL('assets/icon.png',  self.location).href;
  const badgeUrl = new URL('assets/badge.png', self.location).href;
  const options  = {
    body:    data.body,
    icon:    iconUrl,
    badge:   badgeUrl,
    vibrate: [200, 100, 200],
    data:    { url: self.registration.scope }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification Clicks
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
