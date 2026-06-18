/**
 * NailDesk Service Worker
 * Handles background push notifications for the web/PWA surface.
 * Native (Android/iOS) uses Capacitor PushNotifications — this file is web-only.
 */

const CACHE_VERSION = "naildesk-v1";

// ── Lifecycle ──────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── SPA Routing Fallback ───────────────────────────────────────────
// For ANY navigation request (including /payment-success, /payment-failed, etc),
// try to fetch it first. If it fails or returns 404, serve index.html for SPA routing.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API and WebSocket requests - let them fail naturally
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;

  // Skip service worker and manifest files
  if (url.pathname === "/sw.js" || url.pathname === "/manifest.json") return;

  // For asset files, don't apply fallback - let 404 happen
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp|json)$/i.test(url.pathname)) return;

  // For everything else (HTML pages, SPA routes), handle with fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If successful, return the response
        if (response.ok) return response;

        // For 404 on navigation requests, serve index.html for SPA routing
        if (response.status === 404 && (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html"))) {
          return fetch("/index.html");
        }

        return response;
      })
      .catch(() => {
        // On any error (network, etc), serve index.html if it's a navigation request
        if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html")) {
          return fetch("/index.html").catch(() => new Response("Offline", { status: 503 }));
        }
        throw new Error("Fetch failed");
      })
  );
});

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { message: event.data ? event.data.text() : "New notification" };
  }

  const type    = payload.type    ?? "APPOINTMENT_BOOKED";
  const message = payload.message ?? "You have a new notification";
  const appointmentId = payload.appointmentId;

  const title = type === "DEPOSIT_RECEIVED"
    ? "💰 Payment received"
    : type === "APPOINTMENT_CONFIRMED"
    ? "✅ Appointment confirmed"
    : "📅 New booking";

  const options = {
    body: message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: appointmentId ?? type,          // collapses duplicate notifications
    renotify: !!appointmentId,
    data: { appointmentId, type, url: appointmentId ? `/appointments/${appointmentId}` : "/" },
    actions: appointmentId
      ? [{ action: "view", title: "View booking" }]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data   = event.notification.data ?? {};
  const target = data.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing tab if one is open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url: target });
            return;
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
      })
  );
});
