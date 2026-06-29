import { useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, Users, Banknote, Settings } from "lucide-react";
import { cn } from "../lib/cn";

const TABS = [
  { path: "/",            label: "Home",     Icon: Home,         exact: true },
  { path: "/appointments",label: "Bookings", Icon: CalendarDays, exact: false },
  { path: "/clients",     label: "Clients",  Icon: Users,        exact: false },
  { path: "/earnings",    label: "Earnings", Icon: Banknote,     exact: false },
  { path: "/settings",    label: "Settings", Icon: Settings,     exact: false },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position:"fixed", bottom:0, zIndex:50,
        padding:"0 12px calc(16px + env(safe-area-inset-bottom, 0px))",
        maxWidth:480,
        left:"50%", transform:"translateX(-50%)",
        width:"100%",
      }}
    >
      <div
        style={{
          display:"flex", alignItems:"center", justifyContent:"space-around",
          background:"var(--card)",
          border:"1px solid var(--border)",
          borderRadius:"calc(var(--radius) + 4px)",
          padding:"6px",
          backdropFilter:"blur(20px)",
          boxShadow:"0 -1px 0 oklch(0.72 0.12 55 / 0.1), 0 4px 24px oklch(0 0 0 / 0.15)",
          opacity:0.96,
        }}
      >
        {TABS.map(({ path, label, Icon, exact }) => {
          const active = exact ? pathname === path : pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => nav(path)}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"6px 4px",
                borderRadius:"var(--radius)",
                border:"none", cursor:"pointer",
                background: active
                  ? "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.15), oklch(0.62 0.10 25 / 0.08))"
                  : "transparent",
                transition:"all .2s",
                position:"relative", overflow: "hidden",
              }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                style={{ color: active ? "var(--primary)" : "var(--muted-foreground)", transition:"color .2s" }}
              />
              <span
                style={{ 
                  fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
                  fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase",
                  color: active ? "var(--primary)" : "var(--muted-foreground)", transition:"color .2s",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
