import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles } from "lucide-react";
import { api, type Subscription } from "../lib/api";
import { useAuth } from "../lib/auth";

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null;
}

export function SubscriptionBanner() {
  const nav = useNavigate();
  const authStatus = useAuth((s) => s.authStatus);

  const { data } = useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: async () => {
      try { return (await api.get<Subscription>("/tech/subscription/status")).data; }
      catch { return null; }
    },
    enabled: authStatus === "authenticated",
    staleTime: 60_000,
    retry: false,
  });

  if (!data) return null;
  const status     = (data.status ?? "").toLowerCase();
  const isExpired  = status === "expired" || status === "cancelled";
  const isTrial    = status === "trial";
  const days       = data.trialDaysRemaining ?? daysUntil(data.trialEndsAt);

  if (!isExpired && !(isTrial && days !== null && days <= 5)) return null;

  return (
    <div
      onClick={() => nav("/settings/subscription")}
      style={{
        margin:"0 auto", maxWidth:480,
        padding:"0 12px 0",
        cursor:"pointer",
      }}
    >
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 14px",
        borderRadius:12,
        border:"1px solid var(--border)",
        background: isExpired ? "var(--status-rose-bg)" : "var(--status-amber-bg)",
        color: isExpired ? "var(--status-rose-fg)" : "var(--status-amber-fg)",
        boxShadow:"2px 2px 0 0 oklch(0.22 0.02 50)",
      }}>
        {isExpired
          ? <AlertTriangle size={16} style={{ flexShrink:0 }} />
          : <Sparkles size={16} style={{ flexShrink:0 }} />
        }
        <p className="label-mono" style={{ flex:1, lineHeight:1.3 }}>
          {isExpired
            ? "Your subscription has expired — tap to renew"
            : days === 0 ? "Trial ends today — tap to upgrade"
            : `${days} ${days === 1 ? "day" : "days"} left in your free trial`}
        </p>
        <span className="label-mono" style={{ textDecoration:"underline" }}>Manage</span>
      </div>
    </div>
  );
}
