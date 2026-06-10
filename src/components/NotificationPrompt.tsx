import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { GlassCard } from "./ui";
import { requestNotificationPermission } from "../lib/capacitor";

export function NotificationPrompt() {
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check if we should show the prompt
    useEffect(() => {
        // Don't show on web or if already shown
        if (localStorage.getItem("naildesk.notif-prompt-dismissed")) {
            setShow(false);
            return;
        }

        // Check notification permission status
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                setShow(false); // Already granted
            } else if (Notification.permission === "default") {
                setShow(true); // Not yet decided
            } else {
                setShow(false); // Denied
            }
        }
    }, []);

    const handleEnable = async () => {
        setLoading(true);
        try {
            const granted = await requestNotificationPermission();
            if (granted) {
                localStorage.setItem("naildesk.notif-prompt-dismissed", "true");
                setShow(false);
            } else {
                // Still dismiss even if denied, don't spam the user
                localStorage.setItem("naildesk.notif-prompt-dismissed", "true");
                setShow(false);
            }
        } catch (e) {
            console.error("Error requesting notification permission:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("naildesk.notif-prompt-dismissed", "true");
        setShow(false);
    };

    if (!show) return null;

    return (
        <GlassCard style={{
            margin: "0 20px 20px",
            padding: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            position: "relative",
            borderColor: "oklch(0.72 0.12 55 / 0.3)",
            background: "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.06) 0%, oklch(0.72 0.12 55 / 0.02) 100%)"
        }}>
            {/* Icon */}
            <div style={{ display: "flex", flexShrink: 0, marginTop: 2 }}>
                <Bell size={18} style={{ color: "var(--primary)" }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    Stay updated on your bookings
                </p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 10 }}>
                    Get instant notifications for new client bookings, appointment reminders, and payment updates.
                </p>

                <button
                    onClick={handleEnable}
                    disabled={loading}
                    style={{
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        border: "none",
                        borderRadius: "var(--radius)",
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                        transition: "opacity .15s"
                    }}
                >
                    {loading ? "Enabling..." : "Enable notifications"}
                </button>
            </div>

            {/* Close button */}
            <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    padding: 0,
                    display: "flex",
                    flexShrink: 0,
                    marginTop: 2
                }}
            >
                <X size={16} />
            </button>
        </GlassCard>
    );
}