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
// Serve index.html for all navigation requests that don't exist
// This allows React Router to handle all SPA routes including /payment-success, /payment-failed, etc.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API and external requests
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;

  // Skip asset files (they should exist)
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp)$/i.test(url.pathname)) return;

  // For navigation requests (HTML pages), try the request first, then fall back to index.html
  if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, return the response
          if (response.status === 200) return response;
          // If 404, serve index.html for SPA routing
          if (response.status === 404) {
            return fetch(new Request("/index.html"));
          }
          return response;
        })
        .catch(() => {
          // On network error, try to serve index.html
          return fetch(new Request("/index.html"));
        })
    );
  }
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
