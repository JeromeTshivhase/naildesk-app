import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../lib/auth";
import { useNotifications, type NotifType } from "../stores/notifications";
import { WS_URL, isNative } from "../lib/api";
import { loadToken } from "../lib/auth";
import { showLocalNotificationFallback, wasFcmRecentlyDelivered } from "../lib/capacitor";
import { toast } from "sonner";

const KNOWN_TYPES = new Set(["DEPOSIT_RECEIVED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_BOOKED"]);

export function useWebSocket() {
  const authStatus = useAuth((s) => s.authStatus);
  const techId     = useAuth((s) => s.user?.id);
  const addNotif   = useNotifications((s) => s.add);
  const clientRef  = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (authStatus !== "authenticated" || !techId) return;

    let cancelled = false;
    let attemptCount = 0;
    const maxRetries = 3;

    async function connect() {
      if (cancelled || isConnectingRef.current) return;
      isConnectingRef.current = true;

      try {
        // Use native WebSocket directly — SockJS depends on Node.js `global`
        // which doesn't exist in browsers and causes "global is not defined".
        // Spring Boot's STOMP endpoint now supports plain WebSocket at /ws.
        const wsUrl = WS_URL.replace(/^http/, "ws"); // ensure ws:// or wss://

        const client = new Client({
          brokerURL: wsUrl,

          connectHeaders: {
            Authorization: `Bearer ${loadToken() ?? ""}`,
          },

          beforeConnect: async () => {
            const fresh = loadToken();
            client.connectHeaders = {
              Authorization: `Bearer ${fresh ?? ""}`,
            };
          },

          reconnectDelay: 5_000,
          heartbeatIncoming: 10_000,
          heartbeatOutgoing: 10_000,
          debug: (import.meta as any).env?.DEV ? (msg: string) => console.debug("[STOMP]", msg) : () => {},

          onConnect: () => {
            attemptCount = 0;
            if (cancelled) return;

            try {
              client.subscribe(`/topic/tech/${techId}/notifications`, (msg) => {
                try {
                  const data = JSON.parse(msg.body);
                  const type: NotifType = KNOWN_TYPES.has(data.type) ? data.type : "APPOINTMENT_BOOKED";
                  const payload = {
                    type,
                    message: data.message || "New notification",
                    appointmentId: data.appointmentId,
                    clientName: data.clientName,
                  };
                  addNotif(payload);
                  toast.info(data.message || "New notification", { duration: 4000 });
                  if (isNative && !wasFcmRecentlyDelivered(payload.type)) {
                    showLocalNotificationFallback(payload).catch(() => {});
                  }
                } catch {
                  if ((import.meta as any).env?.DEV) console.warn("[STOMP] bad payload");
                }
              });
            } catch (e) {
              if ((import.meta as any).env?.DEV) console.error("[STOMP] subscription error:", e);
            }
          },

          onStompError: (frame) => {
            if ((import.meta as any).env?.DEV) console.error("[STOMP] error", frame);
          },

          onWebSocketError: (error) => {
            if ((import.meta as any).env?.DEV) console.error("[STOMP] WebSocket error:", error);
          },

          onWebSocketClose: () => {
            if ((import.meta as any).env?.DEV) console.log("[STOMP] WebSocket closed");
          },
        });

        if (cancelled) {
          await client.deactivate().catch(() => {});
          return;
        }

        clientRef.current = client;
        client.activate();
      } catch (e) {
        if ((import.meta as any).env?.DEV) console.error("[STOMP] failed to init:", e);
        if (attemptCount < maxRetries && !cancelled) {
          attemptCount++;
          const delay = Math.min(1000 * Math.pow(2, attemptCount), 10000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      } finally {
        isConnectingRef.current = false;
      }
    }

    connect().catch((e) => console.error("[STOMP] Connect error:", e));

    return () => {
      cancelled = true;
      isConnectingRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (clientRef.current) {
        clientRef.current.deactivate().catch(() => {});
      }
      clientRef.current = null;
    };
  }, [authStatus, techId, addNotif]);
}