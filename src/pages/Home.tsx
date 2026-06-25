import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Plus, UserPlus, Banknote, AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { api, type Appointment, type Subscription } from "../lib/api";
import { useAuth } from "../lib/auth";
import { StatusPill, Skeleton, Avatar, SectionTitle, accentColor } from "../components/ui";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { SetupGuideButton, SetupGuideAutoPrompt } from "../components/SetupGuide";
import { fmt } from "../lib/fmt";

export default function HomePage() {
    const user = useAuth((s) => s.user);
    const nav  = useNavigate();

    const dashQ = useQuery({
        queryKey: ["dashboard"],
        queryFn: async () => (await api.get("/tech/dashboard")).data,
        staleTime: 30_000,
    });

    const weeklyQ = useQuery({
        queryKey: ["earnings", "weekly"],
        queryFn: async () => (await api.get("/tech/earnings/weekly")).data,
        staleTime: 60_000,
    });

    const apptQ = useQuery<Appointment[]>({
        queryKey: ["appointments", "today"],
        queryFn: async () => {
            const res = await api.get<Appointment[] | { appointments: Appointment[] }>("/tech/appointments/today");
            const data = res.data;
            return Array.isArray(data) ? data : (data as any)?.appointments ?? [];
        },
        staleTime: 60_000,
    });

    const subQ = useQuery<Subscription>({
        queryKey: ["subscription"],
        queryFn: async () => (await api.get("/tech/subscription/status")).data,
        staleTime: 60_000,
    });

    const linkQ = useQuery({
        queryKey: ["booking-link"],
        queryFn: async () => (await api.get<Record<string, string>>("/booking-link")).data,
        staleTime: Infinity,
    });

    const first  = user?.fullName?.split(" ")[0] ?? "there";
    const hour   = new Date().getHours();
    const greet  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const today  = fmt.date(new Date(), { weekday:"long", day:"numeric", month:"long" });

    const dash: any = dashQ.data ?? {};
    const todayRevenue   = dash.today?.deposits ?? 0;
    const weeklyTotal    = weeklyQ.data?.totalDeposits ?? 0;
    const pendingDeposits = dash.today?.pending ?? 0;
    const sub = subQ.data;

    return (
        <div
            className="bg-app page-glow standalone-safe-bounds animate-fade-in"
            style={{
                paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
            }}
        >
            {/* Header Content Frame */}
            <header style={{ position: "relative", padding: "44px 20px 20px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span className="label-mono" style={{ color: "var(--muted-foreground)" }}>{today}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <SubBadge sub={sub} />
                        <SetupGuideButton />
                    </div>
                </div>
                <h1 className="serif animate-fade-up" style={{ fontSize: 42, lineHeight: .95, fontWeight: 400, margin: 0 }}>
                    {greet},<br />
                    <span style={{ color: "var(--primary)", fontStyle: "italic" }}>{first}.</span>
                </h1>
                <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted-foreground)", fontWeight: 300, margin: "8px 0 0" }}>
                    Here's your day at a glance.
                </p>
            </header>

            {/* Setup Checklist & System Notification Modules */}
            <SetupGuideAutoPrompt />
            <NotificationPrompt />

            {/* Matrix Operational Dashboard Analytics Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 20px" }}>
                <StatCard label="Earned today" value={dashQ.isLoading ? null : fmt.currency(todayRevenue)} primary />
                <StatCard label="This week"    value={(dashQ.isLoading || weeklyQ.isLoading) ? null : fmt.currency(weeklyTotal)} />
                <StatCard label="Pending deposits" value={dashQ.isLoading ? null : String(pendingDeposits)} alert={pendingDeposits > 0} />
                <StatCard label="Today's bookings" value={apptQ.isLoading ? null : String((apptQ.data ?? []).length)} />
            </div>

            {/* Today's Service Schedule Ledger Component Layer */}
            <section style={{ marginTop: 28, padding: "0 20px" }}>
                <SectionTitle
                    eyebrow="Schedule" title="Today"
                    action={
                        <button
                            onClick={() => nav("/appointments")}
                            className="label-mono"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px 0" }}
                        >
                            See all →
                        </button>
                    }
                />
                {apptQ.isLoading ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 86, marginBottom: 8, borderRadius: "var(--radius)" }} />)
                ) : !(apptQ.data?.length) ? (
                    <div className="paper-card animate-fade-up" style={{ padding: 28, textAlign: "center" }}>
                        <h3 className="serif" style={{ fontSize: 20, fontStyle: "italic", fontWeight: 400, margin: 0 }}>No bookings today</h3>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, fontWeight: 300, margin: "6px 0 0" }}>
                            Enjoy the rest or{" "}
                            <Link to="/appointments/new" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>add a booking</Link>.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="animate-fade-up">
                        {(apptQ.data ?? []).map((a) => <ApptCard key={a.id} appt={a} />)}
                    </div>
                )}
            </section>

            {/* Quick-Access Operation Flow Matrix Layout */}
            <section style={{ marginTop: 28, padding: "0 20px" }}>
                <SectionTitle eyebrow="Actions" title="Quick" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <QuickAction icon={<Plus size={16} />}          label="New booking"   to="/appointments/new" />
                    <QuickAction icon={<UserPlus size={16} />}      label="Add client"    to="/clients/new" />
                    <QuickAction icon={<Banknote size={16} />}      label="Log deposit"   to="/earnings" />
                    <QuickAction icon={<AlertTriangle size={16} />} label="Emergency"     to="/settings/emergency" />
                </div>
            </section>

            {/* Dynamic Core Public Share Integration Module Node */}
            <section style={{ margin: "24px 20px 0" }}>
                <BookingLink link={linkQ.data?.deepLink ?? linkQ.data?.url} />
            </section>

            {/* Micro-optimization Structural Overrides Sheet Node */}
            <style>{`
                @media (display-mode: standalone) {
                    .standalone-safe-bounds {
                        padding-top: env(safe-area-inset-top, 24px) !important;
                    }
                }
                a, button, div, span {
                    -webkit-tap-highlight-color: transparent;
                }
                .dashboard-card-clickable:active {
                    transform: scale(0.98) !important;
                    opacity: 0.95;
                }
            `}</style>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, primary, alert }: { label: string; value: string | null; primary?: boolean; alert?: boolean }) {
    return (
        <div
            className="paper-card"
            style={{
                padding: "14px 16px", position: "relative", overflow: "hidden",
                transition: "border-color 0.15s ease",
                ...(primary ? { boxShadow: "var(--shadow-gold)", borderColor: "oklch(from var(--primary) l c h / 0.25)" } : {}),
            }}
        >
            <p className="label-mono" style={{ color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</p>
            {value === null ? (
                <Skeleton style={{ height: 24, width: "65%", borderRadius: "4px" }} />
            ) : (
                <p className="serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, margin: 0, color: primary ? "var(--primary)" : "var(--foreground)" }}>
                    {value}
                </p>
            )}
            {alert && (
                <span className="animate-pulse-glow" style={{ position: "absolute", top: 14, right: 14, width: 6, height: 6, borderRadius: "50%", background: "var(--destructive)" }} />
            )}
        </div>
    );
}

function ApptCard({ appt }: { appt: Appointment }) {
    const nav  = useNavigate();
    const name = appt.client?.fullName ?? appt.clientName ?? "Client";
    const svc  = appt.service?.name ?? appt.serviceName ?? "Service";
    const price = appt.price ?? appt.service?.price;
    const end   = appt.endTime
        ? fmt.time(appt.endTime)
        : appt.service?.durationMinutes
            ? fmt.time(new Date(new Date(appt.startTime).getTime() + appt.service.durationMinutes * 60_000))
            : "";

    return (
        <div
            className="paper-card dashboard-card-clickable animate-float"
            style={{ cursor: "pointer", overflow: "hidden", position: "relative", animationDuration: "6s", transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)" }}
            onClick={() => nav(`/appointments/${appt.id}`)}
        >
            <span style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: accentColor(appt.status) }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 10px 18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="serif" style={{ fontSize: 16, fontWeight: 500 }}>{fmt.time(appt.startTime)}</span>
                    {end && <span className="label-mono" style={{ color: "var(--muted-foreground)", textTransform: "none" }}>to {end}</span>}
                </div>
                <StatusPill status={appt.status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 12px 18px" }}>
                <Avatar initials={fmt.initials(name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--foreground)" }}>{name}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc}</p>
                </div>
                {price != null && <span className="serif" style={{ fontSize: 16, fontWeight: 500, flexShrink: 0 }}>{fmt.currency(Number(price))}</span>}
            </div>
        </div>
    );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
    return (
        <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="paper-card dashboard-card-clickable" style={{ padding: "14px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "transform 0.15s ease" }}>
                <span style={{ color: "var(--primary)", display: "flex", flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>{label}</span>
            </div>
        </Link>
    );
}

function BookingLink({ link }: { link?: string }) {
    const [copied, setCopied] = useState(false);
    const text = link ?? "Loading…";

    function copy() {
        if (!link) return;
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }

    return (
        <div className="paper-card" style={{ padding: 16, borderColor: "oklch(from var(--primary) l c h / 0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                    <p className="label-mono" style={{ color: "var(--primary)", marginBottom: 2 }}>Booking link</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 300, margin: 0 }}>Share with clients</p>
                </div>
                <button onClick={copy} aria-label="Copy link" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", padding: 4 }}>
                    {copied ? <Check size={16} style={{ color: "var(--status-sage-fg)" }} /> : <Copy size={16} />}
                </button>
            </div>
            <div
                onClick={copy}
                title="Click to copy"
                style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "8px 12px",
                    fontFamily: "'SF Mono', monospace",
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    userSelect: "text",
                    WebkitUserSelect: "text"
                }}
            >
                {text}
            </div>
        </div>
    );
}

function SubBadge({ sub }: { sub?: Subscription }) {
    const status = (sub?.status ?? "TRIAL") as string;
    const tier   = (sub?.tier ?? "FREE") as string;
    const bg  = status === "ACTIVE" ? "var(--status-sage-bg)" : status === "TRIAL" ? "var(--status-amber-bg)" : "var(--muted)";
    const fg  = status === "ACTIVE" ? "var(--status-sage-fg)" : status === "TRIAL" ? "var(--status-amber-fg)" : "var(--muted-foreground)";
    return (
        <span className="label-mono" style={{ background: bg, color: fg, borderRadius: 99, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "8px" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
            {tier}{status === "TRIAL" ? " · Trial" : ""}
        </span>
    );
}