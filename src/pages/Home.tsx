import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Plus, UserPlus, Banknote, AlertTriangle, Copy, Check, TrendingUp, Clock, CalendarCheck, Sparkles, Link2 } from "lucide-react";
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
    const todayRevenue    = dash.today?.deposits ?? 0;
    const weeklyTotal     = weeklyQ.data?.totalDeposits ?? 0;
    const pendingDeposits = dash.today?.pending ?? 0;
    const sub = subQ.data;

    return (
        <div
            className="bg-app page-glow standalone-safe-bounds animate-fade-in"
            style={{
                paddingBottom: "calc(100px + env(safe-area-inset-bottom, 16px))",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
            }}
        >
            {/* Header */}
            <header style={{ position: "relative", padding: "44px 20px 22px", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }} className="animate-fade-in">
                    <span className="label-mono" style={{ color: "var(--muted-foreground)" }}>{today}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <SubBadge sub={sub} />
                        <SetupGuideButton />
                    </div>
                </div>
                <h1 className="serif animate-fade-up" style={{ fontSize: 40, lineHeight: .95, fontWeight: 400, margin: 0, position: "relative" }}>
                    {greet},<br />
                    <span style={{ color: "var(--primary)", fontStyle: "italic", position: "relative", display: "inline-block" }}>
                        {first}.
                        <Sparkles
                            size={16}
                            style={{
                                position: "absolute", top: -10, right: -22,
                                color: "oklch(0.76 0.15 58)",
                                animation: "pulseGlow 2.4s ease infinite",
                            }}
                        />
                    </span>
                </h1>
                <p className="animate-fade-up" style={{ marginTop: 8, fontSize: 13, color: "var(--muted-foreground)", fontWeight: 400, margin: "8px 0 0", animationDelay: ".08s" }}>
                    Here's your day at a glance.
                </p>
            </header>

            <SetupGuideAutoPrompt />
            <NotificationPrompt />

            {/* Stats */}
            <div className="stagger-fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 20px" }}>
                <StatCard icon={<TrendingUp size={13} />} label="Earned today"     value={dashQ.isLoading ? null : fmt.currency(todayRevenue)} primary />
                <StatCard icon={<CalendarCheck size={13} />} label="This week"        value={(dashQ.isLoading || weeklyQ.isLoading) ? null : fmt.currency(weeklyTotal)} />
                <StatCard icon={<Banknote size={13} />} label="Pending deposits" value={dashQ.isLoading ? null : String(pendingDeposits)} alert={pendingDeposits > 0} />
                <StatCard icon={<Clock size={13} />} label="Today's bookings" value={apptQ.isLoading ? null : String((apptQ.data ?? []).length)} />
            </div>

            {/* Today's Schedule */}
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
                    <div className="paper-card animate-fade-up" style={{ padding: "28px 24px", textAlign: "center" }}>
                        <h3 className="serif" style={{ fontSize: 20, fontStyle: "italic", fontWeight: 400, margin: 0 }}>No bookings today</h3>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, fontWeight: 400, margin: "6px 0 0" }}>
                            Enjoy the rest or{" "}
                            <Link to="/appointments/new" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>add a booking</Link>.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="stagger-fade-up">
                        {(apptQ.data ?? []).map((a) => <ApptCard key={a.id} appt={a} />)}
                    </div>
                )}
            </section>

            {/* Quick Actions */}
            <section style={{ marginTop: 28, padding: "0 20px" }}>
                <SectionTitle eyebrow="Actions" title="Quick" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <QuickAction icon={<Plus size={18} />}          label="New booking"   to="/appointments/new" accent="oklch(0.76 0.15 58)" />
                    <QuickAction icon={<UserPlus size={18} />}      label="Add client"    to="/clients/new"      accent="oklch(0.58 0.22 350)" />
                    <QuickAction icon={<Banknote size={18} />}      label="Log deposit"   to="/earnings"         accent="oklch(0.55 0.13 155)" />
                    <QuickAction icon={<AlertTriangle size={18} />} label="Emergency"     to="/settings/emergency" accent="oklch(0.55 0.18 22)" />
                </div>
            </section>

            {/* Booking Link */}
            <section style={{ margin: "24px 20px 0" }}>
                <BookingLink link={linkQ.data?.deepLink ?? linkQ.data?.url} />
            </section>

            <style>{`
                @media (display-mode: standalone) {
                    .standalone-safe-bounds {
                        padding-top: env(safe-area-inset-top, 24px) !important;
                    }
                }
                a, button, div, span {
                    -webkit-tap-highlight-color: transparent;
                }
                .appt-card:active {
                    transform: scale(0.98) !important;
                    opacity: 0.95;
                }
            `}</style>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, primary, alert }: { icon?: React.ReactNode; label: string; value: string | null; primary?: boolean; alert?: boolean }) {
    return (
        <div
            className={`paper-card${primary ? " stat-card-primary" : ""}${alert ? " stat-card-alert" : ""}`}
            style={{
                padding: "16px 16px 14px",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.15s ease, transform 0.15s ease",
                ...(primary ? { boxShadow: "var(--shadow-gold)" } : {}),
            }}
        >
            {primary && <span className="shimmer-sweep" aria-hidden="true" />}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                {icon && (
                    <span style={{ display: "flex", color: primary ? "var(--primary)" : alert ? "var(--destructive)" : "var(--muted-foreground)", opacity: 0.85 }}>
                        {icon}
                    </span>
                )}
                <p className="label-mono" style={{ color: primary ? "var(--primary)" : alert ? "var(--destructive)" : "var(--muted-foreground)", margin: 0 }}>{label}</p>
            </div>
            {value === null ? (
                <Skeleton style={{ height: 26, width: "65%", borderRadius: "4px" }} />
            ) : (
                <p className="serif" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1, margin: 0, color: primary ? "var(--primary)" : "var(--foreground)" }}>
                    {value}
                </p>
            )}
            {alert && (
                <span className="animate-pulse-glow" style={{ position: "absolute", top: 16, right: 14, width: 7, height: 7, borderRadius: "50%", background: "var(--destructive)" }} />
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
            className="paper-card appt-card"
            style={{ cursor: "pointer", overflow: "hidden", position: "relative", transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)" }}
            onClick={() => nav(`/appointments/${appt.id}`)}
        >
            <span style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: accentColor(appt.status) }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 10px 18px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="serif" style={{ fontSize: 16, fontWeight: 500 }}>{fmt.time(appt.startTime)}</span>
                    {end && <span className="label-mono" style={{ color: "var(--muted-foreground)", textTransform: "none" }}>→ {end}</span>}
                </div>
                <StatusPill status={appt.status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 12px 18px" }}>
                <Avatar initials={fmt.initials(name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: "var(--foreground)" }}>{name}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc}</p>
                </div>
                {price != null && <span className="serif" style={{ fontSize: 16, fontWeight: 500, flexShrink: 0 }}>{fmt.currency(Number(price))}</span>}
            </div>
        </div>
    );
}

function QuickAction({ icon, label, to, accent }: { icon: React.ReactNode; label: string; to: string; accent?: string }) {
    const color = accent ?? "var(--primary)";
    return (
        <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
            <div
                className="paper-card quick-action"
                style={{ padding: "16px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            >
                <span style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `oklch(from ${color} l c h / 0.12)`,
                    border: `1px solid oklch(from ${color} l c h / 0.18)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color,
                }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.2 }}>{label}</span>
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
        <div className="paper-card" style={{ padding: 16, borderColor: "oklch(from var(--primary) l c h / 0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: "oklch(from var(--primary) l c h / 0.10)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--primary)",
                    }}>
                        <Link2 size={13} />
                    </span>
                    <div>
                        <p className="label-mono" style={{ color: "var(--primary)", marginBottom: 2 }}>Booking link</p>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 400, margin: 0 }}>Share with clients</p>
                    </div>
                </div>
                <button
                    onClick={copy}
                    aria-label="Copy link"
                    style={{
                        background: copied ? "var(--status-sage-bg)" : "oklch(from var(--primary) l c h / 0.08)",
                        border: "1px solid " + (copied ? "var(--status-sage-fg)" : "oklch(from var(--primary) l c h / 0.2)"),
                        borderRadius: 8, cursor: "pointer",
                        color: copied ? "var(--status-sage-fg)" : "var(--primary)",
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 10px", fontSize: 11, fontFamily: "SF Mono,monospace",
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        transition: "all 0.2s",
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <div
                onClick={copy}
                title="Click to copy"
                style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "9px 12px",
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