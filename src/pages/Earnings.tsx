import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api, type EarningsSummary, type DailyEarningsLog } from "../lib/api";
import {
  GlassCard, Skeleton, Button, FormField, Input, SectionTitle,
} from "../components/ui";
import { fmt } from "../lib/fmt";

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

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="paper-card" style={{ padding:"8px 12px", minWidth:100 }}>
      <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:2 }}>{label}</p>
      <p className="serif" style={{ fontSize:18, fontWeight:500, color:"var(--primary)" }}>
        {fmt.currency(payload[0].value)}
      </p>
    </div>
  );
}

export default function EarningsPage() {
  const qc = useQueryClient();
  const [showLog, setShowLog]   = useState(false);
  const [logDate, setLogDate]   = useState(fmt.dateInput(new Date()));
  const [logAmt, setLogAmt]     = useState("");
  const [logNotes, setLogNotes] = useState("");

  const { start, end } = weekBounds();

  const weekQ = useQuery<EarningsSummary>({
    queryKey: ["earnings","weekly"],
    queryFn: async () => (await api.get("/tech/earnings/weekly")).data,
    staleTime: 60_000,
  });

  const monthQ = useQuery<EarningsSummary>({
    queryKey: ["earnings","monthly"],
    queryFn: async () => (await api.get("/tech/earnings/monthly")).data,
    staleTime: 60_000,
  });

  const dailyQ = useQuery<DailyEarningsLog[]>({
    queryKey: ["earnings","daily", start, end],
    queryFn: async () => (await api.get("/tech/earnings/daily", { params:{ start, end } })).data,
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
    <div>
      {/* Header */}
      <div style={{ position:"relative", padding:"48px 20px 20px", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.72 0.12 55 / 0.09) 0%, transparent 100%)" }} />
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <p className="label-mono" style={{ color:"var(--primary)", marginBottom:4 }}>Money</p>
            <h1 className="serif" style={{ fontSize:32, fontWeight:400, lineHeight:1 }}>Deposits</h1>
            <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:4 }}>Client deposits received.</p>
          </div>
          <button
            onClick={() => setShowLog(!showLog)}
            aria-label="Log deposit"
            style={{ width:40, height:40, borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg, oklch(0.78 0.16 58), oklch(0.68 0.14 32))", color:"oklch(0.10 0.01 50)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"var(--shadow-gold)" }}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 20px" }}>
        <GlassCard style={{ padding:"14px 16px", boxShadow:"0 0 0 1px oklch(0.72 0.12 55 / 0.2), 0 4px 24px oklch(0.72 0.12 55 / 0.08)" }}>
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:4 }}>This month</p>
          {monthQ.isLoading
            ? <Skeleton style={{ height:28, width:"60%" }} />
            : <>
                <p className="serif" style={{ fontSize:26, fontWeight:500, color:"var(--primary)", lineHeight:1 }}>
                  {fmt.currency(monthQ.data?.totalDeposits ?? 0)}
                </p>
                {monthQ.data?.depositCount != null && (
                  <p style={{ fontSize:11, color:"var(--muted-foreground)", marginTop:4 }}>
                    {monthQ.data.depositCount} deposit{monthQ.data.depositCount !== 1 ? "s" : ""}
                  </p>
                )}
              </>
          }
        </GlassCard>

        <GlassCard style={{ padding:"14px 16px" }}>
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:4 }}>This week</p>
          {weekQ.isLoading
            ? <Skeleton style={{ height:28, width:"60%" }} />
            : <p className="serif" style={{ fontSize:26, fontWeight:500, lineHeight:1 }}>
                {fmt.currency(weekQ.data?.totalDeposits ?? 0)}
              </p>
          }
        </GlassCard>
      </div>

      {/* Log form */}
      {showLog && (
        <div style={{ padding:"14px 20px 0" }}>
          <GlassCard style={{ padding:20 }}>
            <h3 className="serif" style={{ fontSize:22, fontWeight:400, marginBottom:16 }}>Log deposit</h3>
            <FormField label="Date">
              <Input type="date" value={logDate} max={fmt.dateInput(new Date())} onChange={(e) => setLogDate(e.target.value)} />
            </FormField>
            <FormField label="Amount (R)">
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={logAmt} onChange={(e) => setLogAmt(e.target.value)} />
            </FormField>
            <FormField label="Notes (optional)">
              <Input placeholder="e.g. 3 gel clients" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
            </FormField>
            <div style={{ display:"flex", gap:8 }}>
              <Button variant="gold" fullWidth loading={logMut.isPending} onClick={() => logMut.mutate()}>Save</Button>
              <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Bar chart */}
      <section style={{ padding:"20px 20px 0" }}>
        <SectionTitle eyebrow="Weekly breakdown" title="This week" />
        <GlassCard style={{ padding:"16px 8px 12px" }}>
          {dailyQ.isLoading
            ? <Skeleton style={{ height:160 }} />
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill:"oklch(0.72 0.12 55 / 0.06)", radius:4 }} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[5,5,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </GlassCard>
      </section>

      {/* Daily logs */}
      <section style={{ padding:"20px 20px 0" }}>
        <SectionTitle eyebrow="History" title="Daily logs" />
        {dailyQ.isLoading ? (
          <Skeleton style={{ height:80 }} />
        ) : !(dailyQ.data?.length) ? (
          <GlassCard style={{ padding:28, textAlign:"center" }}>
            <TrendingUp size={28} style={{ color:"var(--muted-foreground)", margin:"0 auto 10px", display:"block" }} />
            <p className="serif" style={{ fontSize:20, fontStyle:"italic", fontWeight:400 }}>No logs this week</p>
            <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:6 }}>Tap + to log your first deposit.</p>
          </GlassCard>
        ) : (
          <GlassCard style={{ overflow:"hidden", padding:0 }}>
            {[...dailyQ.data].reverse().map((log, i, arr) => (
              <div key={log.id}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500 }}>
                    {fmt.date(log.logDate, { weekday:"short", day:"numeric", month:"short" })}
                  </p>
                  {log.notes && <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:1 }}>{log.notes}</p>}
                </div>
                <span className="serif" style={{ fontSize:20, fontWeight:500, color:"var(--primary)" }}>
                  {fmt.currency(log.totalDeposits ?? 0)}
                </span>
              </div>
            ))}
          </GlassCard>
        )}
      </section>
    </div>
  );
}
