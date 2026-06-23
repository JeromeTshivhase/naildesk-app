import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  X, HelpCircle, Check, ChevronRight, User, Scissors, Building2,
  CalendarClock, Link2, Bell, Sparkles,
} from "lucide-react";
import { api, type Profile, type Service } from "../lib/api";
import { GlassCard } from "./ui";

const DISMISS_KEY = "naildesk.setup-guide-seen";

interface WeeklyScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────
interface StepDef {
  key: string;
  icon: typeof User;
  title: string;
  blurb: string;
  to: string;
  done: (ctx: GuideContext) => boolean;
}

interface GuideContext {
  profile?: Partial<Profile>;
  services?: Service[];
  weeklySchedule?: WeeklyScheduleSlot[];
  notifGranted: boolean;
}

const STEPS: StepDef[] = [
  {
    key: "profile",
    icon: User,
    title: "Complete your profile",
    blurb: "Add your name and business name so clients know who they're booking.",
    to: "/settings/profile",
    done: (c) => !!c.profile?.fullName && !!c.profile?.businessName,
  },
  {
    key: "services",
    icon: Scissors,
    title: "Add your services",
    blurb: "List what you offer with prices and duration — clients pick from this menu when they book.",
    to: "/settings",
    done: (c) => (c.services?.length ?? 0) > 0,
  },
  {
    key: "availability",
    icon: CalendarClock,
    title: "Set your working hours",
    blurb: "Tell NailDesk when you're open so clients can only book real, available slots.",
    to: "/settings/availability",
    done: (c) => (c.weeklySchedule ?? []).some((s) => s.active),
  },
  {
    key: "banking",
    icon: Building2,
    title: "Add banking details",
    blurb: "Needed so your deposit payouts can reach you.",
    to: "/settings/banking",
    done: (c) => !!c.profile?.hasBankingDetails,
  },
  {
    key: "notifications",
    icon: Bell,
    title: "Turn on notifications",
    blurb: "Get pinged instantly when a client books or pays a deposit.",
    to: "/settings",
    done: (c) => c.notifGranted,
  },
  {
    key: "share",
    icon: Link2,
    title: "Share your booking link",
    blurb: "Your personal link is on the Home tab — copy it into your Instagram bio or WhatsApp status so clients can start booking.",
    to: "/",
    done: () => false, // always actionable, never auto-completes
  },
];

function getNotifGranted() {
  try {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger button — place this anywhere (Home header, Settings header, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export function SetupGuideButton({ style }: { style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Setup guide & help"
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--card)", border: "1px solid var(--border)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--primary)", flexShrink: 0,
          ...style,
        }}
      >
        <HelpCircle size={18} />
      </button>
      {open && <SetupGuideModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-prompt wrapper — shows once automatically for unfinished setups,
// then is only reachable via the help (?) button.
// ─────────────────────────────────────────────────────────────────────────────
export function SetupGuideAutoPrompt() {
  const [open, setOpen] = useState(false);
  const ctx = useGuideContext();

  useEffect(() => {
    if (ctx.loading) return;
    const seen = localStorage.getItem(DISMISS_KEY);
    // Safely check if all done by providing defaults
    const safeCtx: GuideContext = {
      profile: ctx.profile || {},
      services: Array.isArray(ctx.services) ? ctx.services : [],
      weeklySchedule: Array.isArray(ctx.weeklySchedule) ? ctx.weeklySchedule : [],
      notifGranted: ctx.notifGranted,
    };
    const allDone = STEPS.filter((s) => s.key !== "share").every((s) => s.done(safeCtx));
    if (!seen && !allDone) setOpen(true);
  }, [ctx.loading]);

  if (!open) return null;
  return (
    <SetupGuideModal
      onClose={() => {
        localStorage.setItem(DISMISS_KEY, "true");
        setOpen(false);
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared data hook
// ─────────────────────────────────────────────────────────────────────────────
function useGuideContext(): GuideContext & { loading: boolean } {
  const profileQ = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get<Profile | { profile: Profile }>("/tech/profile");
      const data = res.data;
      return (typeof data === 'object' && data !== null && 'id' in data) ? data as Profile : (data as any)?.profile ?? {};
    },
    staleTime: 60_000,
  });
  const servicesQ = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await api.get<Service[] | { services: Service[] }>("/tech/services");
      const data = res.data;
      return Array.isArray(data) ? data : (data as any)?.services ?? [];
    },
    staleTime: 60_000,
  });
  const scheduleQ = useQuery<WeeklyScheduleSlot[]>({
    queryKey: ["weekly-schedules"],
    queryFn: async () => {
      const res = await api.get<WeeklyScheduleSlot[] | { weeklySchedule: WeeklyScheduleSlot[] }>("/tech/weekly-schedule");
      const data = res.data;
      return Array.isArray(data) ? data : (data as any)?.weeklySchedule ?? [];
    },
    staleTime: 60_000,
    retry: false,
  });

  return {
    profile: profileQ.data,
    services: servicesQ.data,
    weeklySchedule: Array.isArray(scheduleQ.data) ? scheduleQ.data : [],
    notifGranted: getNotifGranted(),
    loading: profileQ.isLoading || servicesQ.isLoading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
function SetupGuideModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const ctx = useGuideContext();

  // Guard against null/undefined data during loading
  const safeContext: GuideContext = {
    profile: ctx.profile || {},
    services: Array.isArray(ctx.services) ? ctx.services : [],
    weeklySchedule: Array.isArray(ctx.weeklySchedule) ? ctx.weeklySchedule : [],
    notifGranted: ctx.notifGranted,
  };

  const doneCount = STEPS.filter((s) => s.key !== "share" && s.done(safeContext)).length;
  const total = STEPS.length - 1; // "share" is excluded from the progress count
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  function goTo(to: string) {
    onClose();
    nav(to);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Setup guide"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "oklch(0.15 0.01 260 / 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up"
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88dvh",
          background: "var(--background)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: "1px solid var(--border)", borderBottom: "none",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ position: "relative", padding: "20px 20px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 100% at 50% 0%, oklch(0.72 0.12 55 / 0.10) 0%, transparent 100%)" }} />
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px", position: "relative" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
            <div>
              <p className="label-mono" style={{ color: "var(--primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} /> Get set up
              </p>
              <h2 className="serif" style={{ fontSize: 24, fontWeight: 400 }}>
                Make your app <span style={{ color: "var(--primary)", fontStyle: "italic" }}>fully functional</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--secondary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", fontWeight: 300, marginTop: 8, position: "relative" }}>
            Finish these steps so clients can find you and book without a hitch.
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: 14, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="label-mono" style={{ color: "var(--muted-foreground)" }}>Progress</span>
              <span className="label-mono" style={{ color: "var(--primary)" }}>{doneCount}/{total} done</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 99, transition: "width .3s ease" }} />
            </div>
          </div>
        </div>

        {/* Steps */}
         <div style={{ padding: "16px 20px 28px", overflowY: "auto", flex: 1 }}>
           {STEPS.map((step, i) => {
             const isDone = step.key !== "share" && step.done(safeContext);
             const Icon = step.icon;
             return (
              <GlassCard
                key={step.key}
                onClick={() => goTo(step.to)}
                style={{
                  padding: 14, marginBottom: 10, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: isDone ? 0.65 : 1,
                  border: isDone ? "1px solid var(--border)" : "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "var(--status-sage-bg)" : "var(--secondary)",
                    color: isDone ? "var(--status-sage-fg)" : "var(--primary)",
                  }}
                >
                  {isDone ? <Check size={17} /> : <Icon size={17} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, textDecoration: isDone ? "line-through" : "none" }}>
                    {i + 1}. {step.title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 300, marginTop: 2, lineHeight: 1.4 }}>
                    {step.blurb}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              </GlassCard>
            );
          })}

          {doneCount === total && (
            <GlassCard style={{ padding: 16, textAlign: "center", marginTop: 4 }} glow>
              <p className="serif" style={{ fontSize: 18, fontStyle: "italic", color: "var(--primary)" }}>
                You're all set! 🎉
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4, fontWeight: 300 }}>
                Don't forget to share your booking link with clients.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
