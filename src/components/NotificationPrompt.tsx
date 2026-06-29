import { useState, useEffect } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { requestNotificationPermission, initWebPush, isNative } from "../lib/capacitor";

export function NotificationPrompt() {
    const [show, setShow]       = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("naildesk.notif-prompt-dismissed")) { setShow(false); return; }
        const snoozeUntil = Number(localStorage.getItem("naildesk.notif-prompt-snooze") ?? 0);
        if (snoozeUntil && Date.now() < snoozeUntil) { setShow(false); return; }
        if (snoozeUntil && Date.now() >= snoozeUntil) localStorage.removeItem("naildesk.notif-prompt-snooze");
        if ("Notification" in window) {
            setShow(Notification.permission === "default");
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const granted = await requestNotificationPermission();
            if (granted) {
                localStorage.setItem("naildesk.notif-prompt-dismissed", "true");
                if (!isNative) initWebPush().catch(() => {});
                setShow(false);
            } else {
                localStorage.setItem("naildesk.notif-prompt-snooze", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
                setShow(false);
            }
        } catch { } finally { setLoading(false); }
    };

    const handleDismiss = () => {
        localStorage.setItem("naildesk.notif-prompt-dismissed", "true");
        setShow(false);
    };

    if (!show) return null;

    return (
        <div style={{ margin: "0 20px 20px", position: "relative", overflow: "hidden" }}>
            {/* Background accent stripe */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: "calc(var(--radius) + 4px)",
                background: "linear-gradient(135deg, oklch(from var(--primary) l c h / 0.08) 0%, transparent 65%)",
                border: "1px solid oklch(from var(--primary) l c h / 0.25)",
                pointerEvents: "none",
            }} />

            <div style={{ position: "relative", padding: "16px 16px 16px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                {/* Icon */}
                <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0, marginTop: 1,
                    background: "oklch(from var(--primary) l c h / 0.12)",
                    border: "1px solid oklch(from var(--primary) l c h / 0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Bell size={17} style={{ color: "var(--primary)" }} />
                </div>

                {/* Text + actions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
                            Turn on notifications
                        </p>
                        <Sparkles size={12} style={{ color: "var(--primary)" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 12px" }}>
                        Get instant alerts for new bookings and payments — never miss a client.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            onClick={handleEnable}
                            disabled={loading}
                            style={{
                                padding: "7px 14px", borderRadius: "var(--radius)",
                                background: "var(--primary)", color: "var(--primary-foreground)",
                                border: "none", cursor: loading ? "not-allowed" : "pointer",
                                fontSize: 12, fontWeight: 600,
                                opacity: loading ? 0.7 : 1, transition: "opacity .15s",
                            }}
                        >
                            {loading ? "Enabling…" : "Enable"}
                        </button>
                        <button
                            onClick={handleDismiss}
                            style={{
                                padding: "7px 12px", borderRadius: "var(--radius)",
                                background: "transparent", color: "var(--muted-foreground)",
                                border: "1px solid var(--border)", cursor: "pointer",
                                fontSize: 12, fontWeight: 500,
                            }}
                        >
                            Not now
                        </button>
                    </div>
                </div>

                {/* Dismiss */}
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2, flexShrink: 0 }}
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    );
}
