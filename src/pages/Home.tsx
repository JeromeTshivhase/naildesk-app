import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Plus, UserPlus, Banknote, AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { api, type Appointment, type Subscription } from "../lib/api";
import { useAuth } from "../lib/auth";
import { GlassCard, StatusPill, Skeleton, Avatar, SectionTitle, accentColor } from "../components/ui";
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
            // Handle both array and wrapped response
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
    // Backend returns { today: { deposits, confirmed, pending, ... }, monthToDate: { deposits }, ... }
    // "stats" key does not exist — map to the correct fields.
    const todayRevenue   = dash.today?.deposits ?? 0;
    const weeklyTotal    = weeklyQ.data?.totalDeposits ?? 0;
    const pendingDeposits = dash.today?.pending ?? 0;
    const sub = subQ.data;

    return (
        <div>
            {/* Hero */}
            <header style={{ position:"relative", padding:"52px 20px 24px", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.72 0.12 55 / 0.14) 0%, transparent 100%)" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, position:"relative" }}>
                    <span className="label-mono" style={{ color:"var(--muted-foreground)" }}>{today}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <SubBadge sub={sub} />
                        <SetupGuideButton />
                    </div>
                </div>
                <h1 className="serif" style={{ fontSize:48, lineHeight:.92, fontWeight:400, position:"relative" }}>
                    {greet},<br />
                    <span style={{ color:"var(--primary)", fontStyle:"italic" }}>{first}.</span>
                </h1>
                <p style={{ marginTop:10, fontSize:14, color:"var(--muted-foreground)", fontWeight:300, position:"relative" }}>
                    Here's your day at a glance.
                </p>
            </header>

            {/* First-run setup checklist (auto-shows until dismissed once) */}
            <SetupGuideAutoPrompt />

            {/* Notification Permission Prompt */}
            <NotificationPrompt />

            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 20px" }}>
                <StatCard label="Earned today" value={dashQ.isLoading ? null : fmt.currency(todayRevenue)} primary />
                <StatCard label="This week"    value={(dashQ.isLoading || weeklyQ.isLoading) ? null : fmt.currency(weeklyTotal)} />
                <StatCard label="Pending deposits" value={dashQ.isLoading ? null : String(pendingDeposits)} alert={pendingDeposits > 0} />
                <StatCard label="Today's bookings" value={apptQ.isLoading ? null : String((apptQ.data ?? []).length)} />
            </div>

            {/* Today's schedule */}
            <section style={{ marginTop:28, padding:"0 20px" }}>
                <SectionTitle
                    eyebrow="Schedule" title="Today"
                    action={
                        <button onClick={() => nav("/appointments")} className="label-mono"
                                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)" }}>
                            See all →
                        </button>
                    }
                />
                {apptQ.isLoading ? (
                    [1,2,3].map((i) => <Skeleton key={i} style={{ height:86, marginBottom:8 }} />)
                ) : !(apptQ.data?.length) ? (
                    <GlassCard style={{ padding:28, textAlign:"center" }}>
                        <h3 className="serif" style={{ fontSize:22, fontStyle:"italic", fontWeight:400 }}>No bookings today</h3>
                        <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:6, fontWeight:300 }}>
                            Enjoy the rest or{" "}
                            <Link to="/appointments/new" style={{ color:"var(--primary)", textDecoration:"none" }}>add a booking</Link>.
                        </p>
                    </GlassCard>
                ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {(apptQ.data ?? []).map((a) => <ApptCard key={a.id} appt={a} />)}
                    </div>
                )}
            </section>

            {/* Quick actions */}
            <section style={{ marginTop:28, padding:"0 20px" }}>
                <SectionTitle eyebrow="Actions" title="Quick" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <QuickAction icon={<Plus size={18} />}          label="New booking"   to="/appointments/new" />
                    <QuickAction icon={<UserPlus size={18} />}      label="Add client"    to="/clients/new" />
                    <QuickAction icon={<Banknote size={18} />}      label="Log deposit"   to="/earnings" />
                    <QuickAction icon={<AlertTriangle size={18} />} label="Emergency"     to="/settings/emergency" />
                </div>
            </section>

            {/* Booking link */}
            <section style={{ margin:"20px 20px 0" }}>
                <BookingLink link={linkQ.data?.deepLink ?? linkQ.data?.url} />
            </section>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value, primary, alert }: { label:string; value:string|null; primary?:boolean; alert?:boolean }) {
    return (
        <GlassCard style={{
            padding:"14px 16px", position:"relative", overflow:"hidden",
            ...(primary ? { boxShadow:"0 0 0 1px oklch(0.72 0.12 55 / 0.2), 0 4px 24px oklch(0.72 0.12 55 / 0.08)" } : {}),
        }}>
            <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:4 }}>{label}</p>
            {value === null
                ? <Skeleton style={{ height:28, width:"60%" }} />
                : <p className="serif" style={{ fontSize:26, fontWeight:500, lineHeight:1, color: primary ? "var(--primary)" : "var(--foreground)" }}>{value}</p>
            }
            {alert && (
                <span className="animate-pulse-glow" style={{ position:"absolute", top:12, right:12, width:8, height:8, borderRadius:"50%", background:"oklch(0.82 0.14 72)", boxShadow:"0 0 8px oklch(0.82 0.14 72 / 0.8)" }} />
            )}
        </GlassCard>
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
        <GlassCard style={{ cursor:"pointer", overflow:"hidden", position:"relative", transition:"transform .15s" }}
                   onClick={() => nav(`/appointments/${appt.id}`)}
                   onMouseOver={(e) => (e.currentTarget.style.transform="scale(1.01)")}
                   onMouseOut={(e) => (e.currentTarget.style.transform="scale(1)")}
        >
            <span style={{ position:"absolute", top:0, left:0, bottom:0, width:3, background:accentColor(appt.status) }} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px 9px 18px", borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span className="serif" style={{ fontSize:17, fontWeight:500 }}>{fmt.time(appt.startTime)}</span>
                    {end && <span className="label-mono" style={{ color:"var(--muted-foreground)" }}>→ {end}</span>}
                </div>
                <StatusPill status={appt.status} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px 12px 18px" }}>
                <Avatar initials={fmt.initials(name)} />
                <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:500 }}>{name}</p>
                    <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:1 }}>{svc}</p>
                </div>
                {price != null && <span className="serif" style={{ fontSize:17, fontWeight:500, flexShrink:0 }}>{fmt.currency(Number(price))}</span>}
            </div>
        </GlassCard>
    );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
    return (
        <Link to={to} style={{ textDecoration:"none" }}>
            <GlassCard style={{ padding:"16px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", transition:"transform .15s" }}
                       onMouseOver={(e) => (e.currentTarget.style.transform="scale(1.02)")}
                       onMouseOut={(e) => (e.currentTarget.style.transform="scale(1)")}
            >
                <span style={{ color:"var(--primary)", display:"flex" }}>{icon}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
            </GlassCard>
        </Link>
    );
}

function BookingLink({ link }: { link?: string }) {
    const [copied, setCopied] = useState(false);
    const text = link ?? "Loading…";
    function copy() {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    }
    return (
        <GlassCard style={{ padding:16, borderColor:"oklch(0.72 0.12 55 / 0.25)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                    <p className="label-mono" style={{ color:"var(--primary)", marginBottom:2 }}>Booking link</p>
                    <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>Share with clients</p>
                </div>
                <button onClick={copy} aria-label="Copy link" style={{ background:"none", border:"none", cursor:"pointer", color:"var(--primary)", display:"flex", alignItems:"center" }}>
                    {copied ? <Check size={18} style={{ color:"var(--status-sage-fg)" }} /> : <Copy size={18} />}
                </button>
            </div>
            <div onClick={copy} title="Click to copy" style={{ background:"var(--secondary)", borderRadius:"var(--radius)", padding:"8px 12px", fontFamily:"'SF Mono',monospace", fontSize:11, color:"var(--muted-foreground)", cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {text}
            </div>
        </GlassCard>
    );
}

function SubBadge({ sub }: { sub?: Subscription }) {
    const status = (sub?.status ?? "TRIAL") as string;
    const tier   = (sub?.tier ?? "FREE") as string;
    const bg  = status === "ACTIVE" ? "var(--status-sage-bg)" : status === "TRIAL" ? "var(--status-amber-bg)" : "var(--muted)";
    const fg  = status === "ACTIVE" ? "var(--status-sage-fg)" : status === "TRIAL" ? "var(--status-amber-fg)" : "var(--muted-foreground)";
    return (
        <span className="label-mono" style={{ background:bg, color:fg, borderRadius:99, padding:"3px 10px", display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor" }} />
            {tier}{status === "TRIAL" ? " · Trial" : ""}
    </span>
    );
}