import { useEffect, useRef, useState } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { useNotifications, type AppNotif } from "../stores/notifications";
import { fmt } from "../lib/fmt";

const TYPE_CFG: Record<AppNotif["type"], { label: string; dot: string }> = {
  DEPOSIT_RECEIVED:      { label: "Deposit",     dot: "var(--status-sage-fg)" },
  APPOINTMENT_CONFIRMED: { label: "Confirmed",   dot: "var(--status-amber-fg)" },
  APPOINTMENT_BOOKED:    { label: "New booking", dot: "var(--primary)" },
};

export function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const notifications         = useNotifications((s) => s.notifications);
  const unread                = useNotifications((s) => s.unreadCount);
  const markRead              = useNotifications((s) => s.markRead);
  const markAllRead           = useNotifications((s) => s.markAllRead);
  const clearNotifs           = useNotifications((s) => s.clear);
  const ref                   = useRef<HTMLDivElement>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && unread > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(markAllRead, 1800);
      }
      return next;
    });
  }

  return (
    <div ref={ref} style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
      {/* Bell */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggle}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: open ? "var(--primary)" : "var(--card)",
          border: "1px solid " + (open ? "transparent" : "var(--border)"),
          cursor: "pointer",
          color: open ? "var(--primary-foreground)" : "var(--foreground)",
          boxShadow: "var(--shadow-card)",
          transition: "all .2s",
        }}
      >
        <Bell size={18} strokeWidth={1.8} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: "var(--destructive)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, padding: "0 4px",
            border: "2px solid var(--background)",
            fontFamily: "SF Mono, monospace",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="paper-card animate-fade-up"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 320, borderRadius: 16, overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Notifications</p>
              {notifications.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0", fontFamily: "SF Mono, monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {unread > 0 ? `${unread} unread` : "All caught up"}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  aria-label="Mark all read"
                  title="Mark all read"
                  style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Bell size={22} style={{ color: "var(--muted-foreground)" }} strokeWidth={1.5} />
                </div>
                <p className="serif" style={{ fontSize: 17, fontStyle: "italic", color: "var(--foreground)", margin: "0 0 4px" }}>All quiet</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 400 }}>We'll let you know when clients book or pay.</p>
              </div>
            ) : (
              <div style={{ padding: "6px" }}>
                {notifications.map((n, i) => {
                  const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.APPOINTMENT_BOOKED;
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "11px 12px", borderRadius: 10,
                        cursor: "pointer", transition: "background .12s",
                        background: n.read ? "transparent" : "oklch(from var(--primary) l c h / 0.05)",
                        border: n.read ? "none" : "1px solid oklch(from var(--primary) l c h / 0.12)",
                        marginBottom: i < notifications.length - 1 ? 4 : 0,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseOut={(e) => (e.currentTarget.style.background = n.read ? "transparent" : "oklch(from var(--primary) l c h / 0.05)")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                        <span style={{ fontFamily: "SF Mono, monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", fontWeight: 600 }}>
                          {cfg.label}
                        </span>
                        <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10, color: "var(--muted-foreground)" }}>
                          {fmt.time(n.createdAt)}
                        </span>
                        {!n.read && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--foreground)", fontWeight: n.read ? 400 : 500, lineHeight: 1.45, margin: 0 }}>
                        {n.message}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => { clearNotifs(); setOpen(false); }}
                style={{ width: "100%", padding: "8px", background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500, transition: "all .15s" }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--destructive)"; e.currentTarget.style.color = "var(--destructive)"; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
