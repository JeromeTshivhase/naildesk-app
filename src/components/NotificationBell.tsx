import { useEffect, useRef, useState } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { useNotifications, type AppNotif } from "../stores/notifications";
import { fmt } from "../lib/fmt";
import { cn } from "../lib/cn";

const TYPE_LABEL: Record<AppNotif["type"], string> = {
  DEPOSIT_RECEIVED:      "Deposit",
  APPOINTMENT_CONFIRMED: "Confirmed",
  APPOINTMENT_BOOKED:    "New booking",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notifications  = useNotifications((s) => s.notifications);
  const unread         = useNotifications((s) => s.unreadCount);
  const markRead       = useNotifications((s) => s.markRead);
  const markAllRead    = useNotifications((s) => s.markAllRead);
  const ref            = useRef<HTMLDivElement>(null);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && unread > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(markAllRead, 1500);
      }
      return next;
    });
  }

  return (
    <div ref={ref} style={{ position:"fixed", top:16, right:16, zIndex:50 }}>
      {/* Bell button */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggle}
        style={{
          position:"relative", width:44, height:44, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"var(--card)", border:"1px solid var(--border)",
          cursor:"pointer", color:"var(--foreground)",
          boxShadow:"2px 3px 0 0 oklch(0.22 0.02 50)",
          transition:"transform .15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform="translateY(-1px)")}
        onMouseOut={(e) => (e.currentTarget.style.transform="translateY(0)")}
      >
        <Bell size={20} strokeWidth={1.8} />
        {unread > 0 && (
          <span style={{
            position:"absolute", top:-4, right:-4,
            minWidth:20, height:20, borderRadius:10,
            background:"var(--primary)", color:"var(--primary-foreground)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:10, fontWeight:700, padding:"0 4px",
            border:"2px solid var(--card)",
            boxShadow:"1px 1px 0 0 oklch(0.22 0.02 50)",
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
            position:"absolute", top:"calc(100% + 8px)", right:0,
            width:300, borderRadius:16,
            boxShadow:"3px 4px 0 0 oklch(0.22 0.02 50)",
            overflow:"hidden",
          }}
        >
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Sparkles size={14} style={{ color:"var(--primary)" }} />
              <h3 style={{ fontSize:15, fontWeight:500, color:"var(--foreground)" }}>Notifications</h3>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--muted)", border:"1px solid var(--border)", cursor:"pointer", color:"var(--muted-foreground)" }}>
              <X size={13} />
            </button>
          </div>

          {/* List */}
          <div style={{ maxHeight:320, overflowY:"auto", padding:"8px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding:"32px 16px", textAlign:"center" }}>
                <p className="serif" style={{ fontSize:18, color:"var(--muted-foreground)", fontStyle:"italic" }}>No notifications yet</p>
                <p className="label-mono" style={{ marginTop:6, color:"var(--muted-foreground)" }}>We'll ping you here</p>
              </div>
            ) : (
              <ul style={{ display:"flex", flexDirection:"column", gap:6, listStyle:"none" }}>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      style={{
                        width:"100%", textAlign:"left", padding:"10px 12px",
                        borderRadius:12, cursor:"pointer", transition:"all .15s",
                        background:"var(--card)", border:"1px solid var(--border)",
                        opacity: n.read ? 0.5 : 1,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.borderColor="var(--foreground)")}
                      onMouseOut={(e) => (e.currentTarget.style.borderColor="var(--border)")}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span className="label-mono" style={{ background:"var(--muted)", color:"var(--muted-foreground)", padding:"2px 6px", borderRadius:99 }}>
                          {TYPE_LABEL[n.type]}
                        </span>
                        <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--muted-foreground)" }}>
                          {fmt.time(n.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:"var(--foreground)", fontWeight: n.read ? 400 : 600, lineHeight:1.4 }}>
                        {n.message}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
