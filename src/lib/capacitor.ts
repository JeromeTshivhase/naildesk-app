/**
 * capacitor.ts
 * Boots all native Capacitor plugins safely (no-ops in browser).
 * Import this once at the top of main.tsx.
 */

import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "ios" | "android" | "web"

// ── Status bar ────────────────────────────────────────────────────────────────
export async function initStatusBar(isDark: boolean) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: isDark ? "#1f1815" : "#fff5f9" });
    }
  } catch {}
}

// ── Splash screen ─────────────────────────────────────────────────────────────
export async function hideSplash() {
  if (!isNative) return;
  const hide = async () => {
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch {}
  };
  // Call immediately and again after delays to guarantee it fires
  await hide();
  setTimeout(hide, 300);
  setTimeout(hide, 800);
}

// ── App back-button (Android) ─────────────────────────────────────────────────
export async function initAppListeners() {
  if (!isNative) return;
  try {
    const { App } = await import("@capacitor/app");
    // Prevent closing app on back button on root screen
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch {}
}

// ── Push notifications ────────────────────────────────────────────────────────
type PushCallback = (payload: { type: string; message: string; appointmentId?: string; clientName?: string }) => void;

// Track if we've attempted push notifications initialization
// NOTE: intentionally NOT guarding re-init so FCM token refresh always reaches backend
let _localNotificationsInitialized = false;

// Tracks notification types recently delivered by FCM (foreground) so the
// STOMP handler can skip posting a duplicate local notification.
const _recentFcmDeliveries = new Set<string>();

/** Returns true if FCM already handled a notification of this type within the last 3 seconds. */
export function wasFcmRecentlyDelivered(type: string): boolean {
  return _recentFcmDeliveries.has(type);
}

/**
 * Returns true if the JWT stored in localStorage is expired (or missing/unparseable).
 * Used to detect stale tokens before posting to /push/subscribe.
 * NOTE: This is synchronous — it reads directly from localStorage to avoid async issues
 * inside the Firebase registration callback.
 */
function isStoredJwtExpired(): boolean {
  try {
    const token = localStorage.getItem("naildesk.token");
    if (!token) return true;
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const exp: number = payload.exp ?? 0;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ageSeconds = exp - nowSeconds;
    console.info(`[Push] JWT expires in ${ageSeconds}s (exp=${exp}, now=${nowSeconds})`);
    return ageSeconds <= 0;
  } catch (e) {
    console.warn("[Push] Could not decode JWT expiry:", e);
    return false; // let the interceptor handle it
  }
}

/**
 * Create Android notification channels.
 * Must be called before any notification is scheduled — on Android 8+ (API 26+)
 * the channel is the sole source of truth for importance, sound, and vibration.
 * Per-notification priority flags are silently ignored without a channel.
 *
 * Channels are idempotent: calling createChannel() for an existing channel is a no-op
 * unless the user has manually changed the channel settings in system preferences,
 * in which case Android preserves the user's choice.
 */
async function createNotificationChannels() {
  if (platform !== "android") return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // High-importance channel — new bookings, deposits, urgent alerts.
    // IMPORTANCE_HIGH (4) = shows as heads-up notification with sound + vibration.
    await LocalNotifications.createChannel({
      id: "naildesk_bookings",
      name: "Bookings & Payments",
      description: "New bookings, deposits received, and appointment updates",
      importance: 4,          // IMPORTANCE_HIGH
      sound: "default",
      vibration: true,
      visibility: 1,          // VISIBILITY_PUBLIC
    });

    // Default-importance channel — general info, reminders.
    // IMPORTANCE_DEFAULT (3) = sound but no heads-up pop-over.
    await LocalNotifications.createChannel({
      id: "naildesk_general",
      name: "General Alerts",
      description: "Reminders and general notifications",
      importance: 3,          // IMPORTANCE_DEFAULT
      sound: "default",
      vibration: true,
      visibility: 1,
    });

    console.info("[Push] Notification channels created");
  } catch (e) {
    console.warn("[Push] Failed to create notification channels:", e);
  }
}

/**
 * Initialize local notifications as a fallback
 */
async function initLocalNotificationsFallback(onMessage: PushCallback) {
  if (_localNotificationsInitialized) return;
  _localNotificationsInitialized = true;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Request permission
    let permGranted = false;
    try {
      const perm = await LocalNotifications.requestPermissions();
      permGranted = perm.display === "granted";
      if (!permGranted) {
        console.info("[Push] Local notification permission not granted");
      }
    } catch (e) {
      console.warn("[Push] Failed to request local notification permissions:", e);
      // Continue anyway - some platforms may not require explicit permission
    }

    // Listen for local notification delivered (shown to user)
    try {
      await LocalNotifications.addListener("localNotificationReceived", (notification) => {
        try {
          console.info("[Push] Local notification received:", notification.title);
        } catch (e) {
          // Silently fail
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add local notification received listener:", e);
    }

    // Listen for local notification actions (when user taps it)
    try {
      await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        try {
          const data = action.notification.extra ?? {};
          if (data.type && data.message) {
            onMessage({
              type: data.type,
              message: data.message,
              appointmentId: data.appointmentId,
              clientName: data.clientName,
            });

            if (data.appointmentId) {
              window.location.hash = `/appointments/${data.appointmentId}`;
            }
          }
        } catch (e) {
          console.warn("[Push] Error handling local notification action:", e);
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add local notification action listener:", e);
    }

    console.info("[Push] Local notifications initialized" + (permGranted ? " with permission" : " (permission may be required)"));
  } catch (e) {
    console.warn("[Push] Failed to initialize local notifications:", e);
  }
}

/**
 * Show a local notification as fallback (also called from useWebSocket for
 * foreground/background STOMP messages on Android so a native OS notification
 * is always posted, not just an in-app toast).
 */
export async function showLocalNotificationFallback(payload: { type: string; message: string; appointmentId?: string; clientName?: string }) {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Route to the correct channel so Android honours the right importance level.
    const highPriorityTypes = ["APPOINTMENT_BOOKED", "DEPOSIT_RECEIVED", "APPOINTMENT_CONFIRMED"];
    const channelId = highPriorityTypes.includes(payload.type)
        ? "naildesk_bookings"
        : "naildesk_general";

    // Map internal event types to human-readable titles.
    const titleMap: Record<string, string> = {
      APPOINTMENT_BOOKED:    "New Booking 📅",
      APPOINTMENT_CONFIRMED: "Booking Confirmed ✅",
      DEPOSIT_RECEIVED:      "Deposit Received 💰",
      APPOINTMENT_CANCELLED: "Booking Cancelled",
      APPOINTMENT_REMINDER:  "Upcoming Appointment 🔔",
    };
    const title = titleMap[payload.type] ?? "Naildesk";

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body: payload.message,
        id: Math.floor(Math.random() * 10000),
        smallIcon: "ic_stat_naildesk",
        channelId,
        extra: {
          type: payload.type,
          message: payload.message,
          appointmentId: payload.appointmentId,
          clientName: payload.clientName,
        },
      }],
    });
  } catch (e) {
    // Silently fail
  }
}

/**
 * Initialize Web Push API for browsers
 */
async function initWebPush() {
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;

  try {
    // Register our service worker if not already registered.
    // navigator.serviceWorker.ready only resolves once a SW is controlling the page,
    // so we must register first — previously this was never called, causing ready to hang.
    await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("[Push] SW registration failed:", e);
    });

    const registration = await navigator.serviceWorker.ready;

    // Forward SW NAVIGATE messages (from notification clicks) into the app router
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "NAVIGATE" && event.data.url) {
        window.location.hash = event.data.url;
      }
    });

    // Request permission if not already granted
    if (Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }

    if (Notification.permission !== "granted") return;

    // Check for an existing subscription first
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.info("[Push] Web Push already subscribed");
      return;
    }

    // Fetch the VAPID public key from the backend
    let vapidPublicKey: string | undefined;
    try {
      const { api } = await import("./api");
      const { data } = await api.get<{ publicKey: string }>("/push/vapid-public-key");
      vapidPublicKey = data.publicKey;
    } catch (e) {
      console.warn("[Push] Could not fetch VAPID public key:", e);
      return;
    }

    if (!vapidPublicKey) {
      console.warn("[Push] VAPID public key is empty — skipping web push subscription");
      return;
    }

    // Convert Base64URL VAPID key to Uint8Array
    const padding = "=".repeat((4 - (vapidPublicKey.length % 4)) % 4);
    const base64 = (vapidPublicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: rawKey,
    }).catch((e) => {
      console.warn("[Push] Web Push subscribe failed:", e);
      return undefined;
    });

    if (newSubscription) {
      // Send the subscription to the backend
      try {
        const { api } = await import("./api");
        const json = newSubscription.toJSON();
        await api.post("/push/subscribe", {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          platform: "web",
        });
        console.info("[Push] Web Push subscription registered with backend");
      } catch (e) {
        console.warn("[Push] Failed to register web push subscription with backend:", e);
      }
    }
  } catch (e) {
    console.warn("[Push] Web Push initialization failed:", e);
  }
}

/**
 * Request notification permission immediately, without relying on Firebase.
 * Uses LocalNotifications on Android (no FCM needed) which triggers the
 * POST_NOTIFICATIONS runtime dialog on Android 13+.
 * Call this as soon as the user is authenticated — before any push init.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative) {
    // Web: use the standard Notification API
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    const granted = perm.display === "granted";
    console.info(`[Push] Notification permission: ${perm.display}`);
    return granted;
  } catch (e) {
    console.warn("[Push] Could not request notification permission:", e);
    return false;
  }
}

export async function initPushNotifications(onMessage: PushCallback) {
  if (!isNative) {
    // On web, initialize Web Push API
    initWebPush().catch((e) => {
      console.warn("[Push] Web Push initialization failed:", e);
    });
    return;
  }

  // NOTE: No _pushNotificationsInitialized guard here intentionally.
  // Firebase can issue a new token after app updates or token rotation.
  // Every authStatus→authenticated transition should re-register so the
  // backend always has a fresh token.

  // Ensure channels exist before ANY notification can arrive (FCM or local).
  // Must run before requestPermissions and before initLocalNotificationsFallback
  // so the first notification posted always has a valid channel on Android 8+.
  await createNotificationChannels().catch((e) => {
    console.warn("[Push] Failed to pre-create notification channels:", e);
  });

  // Initialize local notifications as fallback for all platforms
  await initLocalNotificationsFallback(onMessage).catch((e) => {
    console.warn("[Push] Failed to initialize local notifications fallback:", e);
  });

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    let perm;
    try {
      perm = await PushNotifications.requestPermissions();
    } catch (e) {
      console.warn("[Push] Failed to request permissions:", e);
      console.warn("[Push] Push notifications disabled, using local notifications only");
      return;
    }

    if (perm?.receive !== "granted") {
      console.info("[Push] Push notification permission not granted");
      console.info("[Push] Using local notifications only");
      return;
    }

    // Register with FCM / APNs
    try {
      await PushNotifications.register();
      console.info(`[Push] FCM/APNs registration successful on ${platform}`);
    } catch (e: any) {
      const errMsg = e?.message || e?.toString() || "";
      if (errMsg.includes("FirebaseApp") || errMsg.includes("not initialized")) {
        console.warn(`[Push] Firebase not initialized on ${platform}`);
        console.info(`[Push] To enable Firebase: Place google-services.json in android/app/ and rebuild`);
        return;
      }
      console.warn(`[Push] Failed to register on ${platform}:`, e);
      return;
    }

    // Token received → send to backend
    try {
      await PushNotifications.addListener("registration", async (token) => {
        try {
          const { api } = await import("./api");
          console.info(`[Push] Received FCM/APNs token: ${token.value.substring(0, 20)}...`);

          // Warn if the stored JWT looks expired — the request interceptor will
          // attempt a token refresh automatically, but this log helps debugging.
          if (isStoredJwtExpired()) {
            console.warn("[Push] Stored JWT appears expired — interceptor will attempt refresh before subscribe POST");
          }

          await api.post("/push/subscribe", {
            endpoint: token.value,
            p256dh: "",
            auth: "",
            platform: platform,
          }).then(() => {
            console.info("[Push] Successfully registered FCM token with backend");
          }).catch((e) => {
            console.warn("[Push] Failed to subscribe token on backend:", e?.response?.status, e?.response?.data ?? e?.message);
          });
        } catch (e) {
          console.warn("[Push] Error in registration listener:", e);
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add registration listener:", e);
    }

    // Registration error
    try {
      await PushNotifications.addListener("registrationError", (err) => {
        try {
          console.warn("[Push] Registration error:", err);
        } catch (e) {
          console.warn("[Push] Error in registration error handler:", e);
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add registration error listener:", e);
    }

    // Foreground notification received — FCM is silent when app is open,
    // so we post a local notification ourselves. We also feed it into the
    // in-app store so the bell updates immediately.
    try {
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        try {
          const data = notification.data ?? {};
          const payload = {
            type: data.type ?? "APPOINTMENT_BOOKED",
            // Prefer the structured data.message from the FCM data payload.
            // Fall back to notification.body only if data.message is absent.
            message: data.message ?? notification.body ?? notification.title ?? "New notification",
            appointmentId: data.appointmentId,
            clientName: data.clientName,
          };

          console.info("[Push] Foreground FCM/APNs notification received:", payload.type);
          onMessage(payload);

          // Mark this type as recently handled by FCM so the STOMP handler
          // doesn't post a duplicate local notification.
          _recentFcmDeliveries.add(payload.type);
          setTimeout(() => _recentFcmDeliveries.delete(payload.type), 3000);

          // Show as local notification so the user sees it while the app is open.
          // (FCM notifications are suppressed by Android when the app is in the foreground.)
          showLocalNotificationFallback(payload).catch(() => {});
        } catch (e) {
          console.warn("[Push] Error handling foreground notification:", e);
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add foreground notification listener:", e);
    }

    // Notification tapped (app was backgrounded or killed).
    // Android already showed the FCM notification — do NOT post another local one.
    // Just update the in-app store and navigate to the relevant screen.
    try {
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        try {
          const data = action.notification.data ?? {};
          const payload = {
            type: data.type ?? "APPOINTMENT_BOOKED",
            message: data.message ?? action.notification.body ?? "Notification tapped",
            appointmentId: data.appointmentId,
            clientName: data.clientName,
          };

          console.info("[Push] FCM/APNs notification action performed:", payload.type);
          onMessage(payload);

          // Navigate to appointment detail if we have an id
          if (data.appointmentId) {
            window.location.hash = `/appointments/${data.appointmentId}`;
          }
        } catch (e) {
          console.warn("[Push] Error handling notification action:", e);
        }
      });
    } catch (e) {
      console.warn("[Push] Failed to add notification action listener:", e);
    }
  } catch (e) {
    console.warn("[Push] Push notifications not available:", e);
    console.info("[Push] Local notifications will be used");
  }
}

// ── URL opener ───────────────────────────────────────────────────────────────
// On native, use the Capacitor Browser plugin so the in-app browser handles
// the PayFast payment flow. On web, fall back to a plain window.open.
export async function openURL(url: string): Promise<void> {
  if (isNative) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch (e) {
      console.warn("[openURL] Capacitor Browser failed, falling back to window.open:", e);
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}


export async function hapticImpact(style: "light" | "medium" | "heavy" = "light") {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {}
}

export async function hapticNotification(type: "success" | "warning" | "error" = "success") {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } catch {}
}

// ── Network ───────────────────────────────────────────────────────────────────
export async function initNetworkListener(onChange: (online: boolean) => void) {
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    onChange(status.connected);
    await Network.addListener("networkStatusChange", (s) => onChange(s.connected));
  } catch {
    // In browser fall back to navigator.onLine events
    window.addEventListener("online",  () => onChange(true));
    window.addEventListener("offline", () => onChange(false));
  }
}