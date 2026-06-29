import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp, Landmark, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api, type DailyEarningsLog } from "../lib/api";
import {
    Skeleton, Button, FormField, Input, SectionTitle, PageHeader,
} from "../components/ui";
import { fmt } from "../lib/fmt";
import { EarningsBreakdownCard, BelowThresholdAlert } from "../components/earnings/EarningsBreakdown";
import { PayoutHistory } from "../components/earnings/PayoutHistory";
import {
    useWeeklyBreakdown,
    useMonthlyBreakdown,
    usePayoutHistory,
} from "../hooks/useEarnings";

function weekBounds() {
    const end   = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
    return { start: fmt.dateInput(start), end: fmt.dateInput(end) };
}

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function buildChart(logs: DailyEarningsLog[], start: string) {
    const map = new Map(logs.map((l) => [l.logDate, l.totalDeposits ?? 0]));
    return Array.from({ length:7 }, (_,i) => {
        const d = new Date(start + "T00:00:00");
        d.setDate(d.getDate() + i);
        const key = fmt.dateInput(d);
        return { day: DAY_NAMES[d.getDay()], date: key, amount: map.get(key) ?? 0 };
    });
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="paper-card" style={{ padding:"8px 12px", minWidth:100 }}>
            <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:2 }}>{label}</p>
            <p className="serif" style={{ fontSize:18, fontWeight:500, color:"var(--primary)", margin: 0 }}>
                {fmt.currency(payload[0].value)}
            </p>
        </div>
    );
}

type Tab = "overview" | "payouts";

export default function EarningsPage() {
    const qc = useQueryClient();
    const [tab, setTab]         = useState<Tab>("overview");
    const [showLog, setShowLog] = useState(false);
    const [logDate, setLogDate] = useState(fmt.dateInput(new Date()));
    const [logAmt, setLogAmt]   = useState("");
    const [logNotes, setLogNotes] = useState("");

    const { start, end } = weekBounds();

    const weekQ   = useWeeklyBreakdown();
    const monthQ  = useMonthlyBreakdown();
    const payoutsQ = usePayoutHistory();

    const dailyQ = useQuery<DailyEarningsLog[]>({
        queryKey: ["earnings","daily", start, end],
        queryFn: async () => {
            const res = await api.get<DailyEarningsLog[] | { dailyLogs: DailyEarningsLog[] }>("/tech/earnings/daily", { params:{ start, end } });
            const responseData = res.data;
            return Array.isArray(responseData) ? responseData : (responseData as any)?.dailyLogs ?? [];
        },
        staleTime: 60_000,
    });

    const logMut = useMutation({
        mutationFn: async () =>
            (await api.post("/tech/earnings/daily", {
                logDate,
                totalDeposits: Number(logAmt),
                notes: logNotes.trim() || undefined,
            })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey:["earnings"] });
            qc.invalidateQueries({ queryKey:["dashboard"] });
            toast.success("Earnings logged 💰");
            setShowLog(false);
            setLogAmt(""); setLogNotes("");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message ?? "Could not log"),
    });

    const chart = buildChart(dailyQ.data ?? [], start);

    return (
        <div
            className="animate-fade-in standalone-safe-bounds"
            style={{
                paddingBottom: "calc(100px + env(safe-area-inset-bottom, 16px))",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
            }}
        >
            {/* Header content vector layout block */}
            <PageHeader
                eyebrow="Money"
                title="Earnings"
                subtitle="Your deposits & payouts."
                action={
                    tab === "overview" ? (
                        <button
                            onClick={() => setShowLog(!showLog)}
                            aria-label="Log deposit"
                            className="dashboard-card-clickable"
                            style={{
                                width:40, height:40, borderRadius:12, border:"none", cursor:"pointer",
                                background:"linear-gradient(135deg, oklch(0.78 0.16 58), oklch(0.68 0.14 32))",
                                color:"oklch(0.10 0.01 50)", display:"flex", alignItems:"center", justifyContent:"center",
                                boxShadow:"var(--shadow-gold)", transition: "transform 0.1s ease"
                            }}>
                            <Plus size={20} />
                        </button>
                    ) : undefined
                }
            />

            {/* Dynamic Context Tabs */}
            <div style={{ display:"flex", gap:6, padding:"0 20px 16px" }}>
                {(["overview","payouts"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            height:34, paddingInline:14, borderRadius:10, border:"1px solid var(--border)",
                            cursor:"pointer", fontSize:13, fontWeight:500, transition:"all .15s",
                            background: tab === t ? "var(--primary)" : "transparent",
                            color: tab === t ? "oklch(0.10 0.01 50)" : "var(--muted-foreground)",
                            borderColor: tab === t ? "var(--primary)" : "var(--border)",
                        }}>
                        {t === "overview" ? "Overview" : "Payout history"}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
            {tab === "overview" && (
                <>
                    {/* Analytics Matrix Scorecards */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 20px" }}>
                        <EarningsBreakdownCard
                            breakdown={weekQ.data ?? { grossTotal:0, platformFee:0, netTotal:0, feeRate:0.10, depositCount:0, belowThreshold:false, payoutThreshold:50, period:"WEEKLY" }}
                            loading={weekQ.isLoading}
                            label="This week"
                        />
                        <EarningsBreakdownCard
                            breakdown={monthQ.data ?? { grossTotal:0, platformFee:0, netTotal:0, feeRate:0.10, depositCount:0, belowThreshold:false, payoutThreshold:50, period:"MONTHLY" }}
                            loading={monthQ.isLoading}
                            label="This month"
                        />
                    </div>

                    {/* Threshold Boundary Fallback Notice */}
                    {weekQ.data?.belowThreshold && (
                        <div style={{ padding:"10px 20px 0" }}>
                            <BelowThresholdAlert
                                net={weekQ.data.netTotal}
                                threshold={weekQ.data.payoutThreshold}
                            />
                        </div>
                    )}

                    {/* Operational Automated Payout Route Tracking Node */}
                    {(weekQ.data?.netTotal ?? 0) >= (weekQ.data?.payoutThreshold ?? 50) && (
                        <div style={{ padding:"10px 20px 0" }}>
                            <div style={{
                                display:"flex", alignItems:"center", gap:10,
                                background:"var(--input)",
                                border:"1px solid var(--border)",
                                borderRadius:12, padding:"12px 14px",
                            }}>
                                <Landmark size={16} style={{ color:"var(--primary)", flexShrink:0 }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize:13, fontWeight:500, color:"var(--foreground)", margin:0 }}>Payout on track</p>
                                    <p style={{ fontSize:12, color:"var(--muted-foreground)", lineHeight:1.4, margin:0, marginTop:2 }}>
                                        Next payout: Friday at 15:00 SAST
                                    </p>
                                </div>
                                <button
                                    onClick={() => setTab("payouts")}
                                    aria-label="View history"
                                    style={{ background:"none", border:"none", cursor:"pointer", color:"var(--primary)", display:"flex", alignItems:"center", padding: 4 }}>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Secure Log Processing Engine Panel */}
                    {showLog && (
                        <div style={{ padding:"14px 20px 0" }}>
                            <div className="paper-card animate-fade-up" style={{ padding:20 }}>
                                <h3 className="serif" style={{ fontSize:22, fontWeight:400, marginBottom:16, margin:0 }}>Log deposit</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16, marginBottom: 20 }}>
                                    <FormField label="Date">
                                        <Input type="date" value={logDate} max={fmt.dateInput(new Date())} onChange={(e) => setLogDate(e.target.value)} />
                                    </FormField>
                                    <FormField label="Amount (R)">
                                        <Input type="number" min="0" step="0.01" placeholder="0.00" value={logAmt} onChange={(e) => setLogAmt(e.target.value)} />
                                    </FormField>
                                    <FormField label="Notes (optional)">
                                        <Input placeholder="e.g. 3 gel clients" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
                                    </FormField>
                                </div>
                                <div style={{ display:"flex", gap:8 }}>
                                    <Button variant="gold" fullWidth loading={logMut.isPending} onClick={() => logMut.mutate()}>Save</Button>
                                    <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Visualization Chart Pipeline */}
                    <section style={{ padding:"20px 20px 0" }}>
                        <SectionTitle eyebrow="Weekly breakdown" title="This week" />
                        <div className="paper-card animate-fade-up" style={{ padding:"16px 8px 12px 4px" }}>
                            {dailyQ.isLoading
                                ? <Skeleton style={{ height:160, borderRadius: "var(--radius)" }} />
                                : (
                                    <ResponsiveContainer width="100%" height={170}>
                                        <BarChart data={chart} margin={{ left:-16, right:8, top:4, bottom:0 }}>
                                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                                            <XAxis
                                                dataKey="day"
                                                tick={{ fontSize:10, fill:"var(--muted-foreground)", fontFamily:"SF Mono,ui-monospace,monospace" }}
                                                axisLine={false} tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize:9, fill:"var(--muted-foreground)" }}
                                                axisLine={false} tickLine={false}
                                                tickFormatter={(v: number) =>
                                                    v === 0 ? "0" :
                                                        v >= 1000 ? `R${(v/1000).toFixed(1)}k` : `R${v}`}
                                            />
                                            <Tooltip content={<ChartTooltip />} cursor={{ fill:"var(--input)", opacity: 0.4, radius:4 }} />
                                            <Bar dataKey="amount" fill="var(--primary)" radius={[4,4,0,0]} maxBarSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )
                            }
                        </div>
                    </section>

                    {/* Chronological Transaction Entry History Ledger */}
                    <section style={{ padding:"20px 20px 0" }}>
                        <SectionTitle eyebrow="History" title="Daily logs" />
                        {dailyQ.isLoading ? (
                            <Skeleton style={{ height:80, borderRadius: "var(--radius)" }} />
                        ) : !(dailyQ.data?.length) ? (
                            <div className="paper-card animate-fade-up" style={{ padding:28, textAlign:"center" }}>
                                <TrendingUp size={28} style={{ color:"var(--muted-foreground)", margin:"0 auto 10px", display:"block" }} />
                                <h3 className="serif" style={{ fontSize:20, fontStyle:"italic", fontWeight:400, margin:0 }}>No logs this week</h3>
                                <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:6, margin: "6px 0 0" }}>Tap + to log your first deposit.</p>
                            </div>
                        ) : (
                            <div className="paper-card animate-fade-up" style={{ overflow:"hidden", padding:0 }}>
                                {[...dailyQ.data].reverse().map((log, i, arr) => (
                                    <div key={log.id}
                                         style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
                                        <div>
                                            <p style={{ fontSize:14, fontWeight:500, margin:0, color:"var(--foreground)" }}>
                                                {fmt.date(log.logDate, { weekday:"short", day:"numeric", month:"short" })}
                                            </p>
                                            {log.notes && <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:3, margin:0 }}>{log.notes}</p>}
                                        </div>
                                        <span className="serif" style={{ fontSize:20, fontWeight:500, color:"var(--primary)" }}>
                              {fmt.currency(log.totalDeposits ?? 0)}
                            </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* ── PAYOUTS TAB ─────────────────────────────────────────────── */}
            {tab === "payouts" && (
                <section style={{ padding:"0 20px" }} className="animate-fade-up">
                    <SectionTitle eyebrow="Transfers" title="Payout history" />
                    <p style={{ fontSize:13, color:"var(--muted-foreground)", marginBottom:16, lineHeight:1.6, fontWeight:300 }}>
                        Payouts run every Friday at 15:00 SAST. Each shows the gross client deposit, the 10% platform fee, and the net amount sent to your bank.
                    </p>
                    <PayoutHistory payouts={payoutsQ.data ?? []} loading={payoutsQ.isLoading} />
                </section>
            )}

            {/* Hardware Constraint Runtime Configurations Style Block */}
            <style>{`
            @media (display-mode: standalone) {
                .standalone-safe-bounds {
                    padding-top: env(safe-area-inset-top, 20px) !important;
                }
            }
            a, button, div, span {
                -webkit-tap-highlight-color: transparent;
            }
            .dashboard-card-clickable:active {
                transform: scale(0.96) !important;
                opacity: 0.9;
            }
        `}</style>
        </div>
    );
}