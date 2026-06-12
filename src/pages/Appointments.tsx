import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, Phone, CheckCircle2, XCircle, Clock, CalendarX, RotateCcw, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  api, type Appointment, type AppointmentStatus,
  type Client, type Service, type Subscription,
} from "../lib/api";
import {
  GlassCard, StatusPill, Skeleton, Avatar, EmptyState,
  Button, FormField, Input, Textarea, Select, PageHeader,
  BackButton, accentColor, Toggle,
} from "../components/ui";
import { fmt } from "../lib/fmt";

// ─────────────────────────────────────────────────────────────────────────────
// Appointments List
// ─────────────────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dayOffset(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export function AppointmentsPage() {
  const nav = useNavigate();
  const [sel, setSel] = useState(0);
  const date = dayOffset(sel);
  const start = new Date(date); start.setHours(0,0,0,0);
  const end   = new Date(date); end.setHours(23,59,59,999);

  const { data, isLoading } = useQuery<Appointment[]>({
    queryKey: ["appointments", fmt.dateInput(date)],
    queryFn: async () => (await api.get("/tech/appointments", {
      params: { start: start.toISOString(), end: end.toISOString() },
    })).data,
    staleTime: 30_000,
  });

  return (
    <div>
      {/* Header */}
      <div style={{ position:"relative", padding:"48px 20px 12px", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.72 0.12 55 / 0.09) 0%, transparent 100%)" }} />
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <p className="label-mono" style={{ color:"var(--primary)", marginBottom:4 }}>Schedule</p>
            <h1 className="serif" style={{ fontSize:32, fontWeight:400, lineHeight:1 }}>Bookings</h1>
          </div>
          <button onClick={() => nav("/appointments/new")} aria-label="New booking"
            style={{ width:40, height:40, borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg, oklch(0.78 0.16 58), oklch(0.68 0.14 32))", color:"oklch(0.10 0.01 50)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"var(--shadow-gold)" }}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div style={{ overflowX:"auto", padding:"0 20px 12px", scrollbarWidth:"none" }}>
        <div style={{ display:"flex", gap:6, width:"max-content" }}>
          {Array.from({ length:14 }, (_,i) => {
            const d = dayOffset(i);
            const on = i === sel;
            return (
              <button key={i} onClick={() => setSel(i)} style={{
                width:48, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"8px 4px", borderRadius:"var(--radius)", border:"1px solid transparent",
                cursor:"pointer", transition:"all .2s",
                background: on ? "linear-gradient(135deg, oklch(0.78 0.16 58), oklch(0.68 0.14 32))" : "transparent",
              }}>
                <span className="label-mono" style={{ color: on ? "oklch(0.10 0.01 50 / 0.7)" : "var(--muted-foreground)", fontSize:9 }}>
                  {DAY_NAMES[d.getDay()]}
                </span>
                <span className="serif" style={{ fontSize:20, fontWeight:400, color: on ? "oklch(0.10 0.01 50)" : "var(--foreground)" }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ padding:"0 20px" }}>
        {isLoading
          ? [1,2].map((i) => <Skeleton key={i} style={{ height:90, marginBottom:8 }} />)
          : !data?.length
          ? <EmptyState title="No bookings this day" subtitle="Tap + to add one."
              action={<Button variant="gold" size="sm" onClick={() => nav("/appointments/new")}>New booking</Button>}
            />
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {data.map((a) => <ApptListCard key={a.id} appt={a} />)}
            </div>
        }
      </div>
    </div>
  );
}

function ApptListCard({ appt }: { appt: Appointment }) {
  const nav  = useNavigate();
  const name = appt.client?.fullName ?? appt.clientName ?? "Client";
  const svc  = appt.service?.name   ?? appt.serviceName ?? "Service";
  const price = appt.price ?? appt.service?.price;
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
          {appt.endTime && <span className="label-mono" style={{ color:"var(--muted-foreground)" }}>→ {fmt.time(appt.endTime)}</span>}
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

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Detail
// ─────────────────────────────────────────────────────────────────────────────
const TERMINAL = new Set<AppointmentStatus>(["COMPLETED","CANCELLED","NO_SHOW"]);

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const qc     = useQueryClient();
  const [showCancel, setShowCancel]       = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelReason, setCancelReason]   = useState("");
  const [newDate, setNewDate]             = useState("");
  const [newTime, setNewTime]             = useState("");

  const { data, isLoading } = useQuery<Appointment>({
    queryKey: ["appointment", id],
    queryFn: async () => (await api.get(`/tech/appointments/${id}`)).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appointments"] });
    qc.invalidateQueries({ queryKey: ["appointment", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const statusMut = useMutation({
    mutationFn: async ({ status, cancelReason }: { status: AppointmentStatus; cancelReason?: string }) =>
      (await api.patch(`/tech/appointments/${id}/status`, { status, cancelReason })).data,
    onSuccess: (_, { status }) => {
      invalidate();
      setShowCancel(false);
      toast.success(
        status === "COMPLETED" ? "Marked complete ✓" :
        status === "CANCELLED" ? "Booking cancelled" : "Status updated"
      );
    },
    onError: () => toast.error("Could not update status"),
  });

  const rescheduleMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/tech/appointments/${id}/reschedule`, { newStartTime: fmt.localIso(newDate, newTime) })).data,
    onSuccess: () => { invalidate(); setShowReschedule(false); toast.success("Rescheduled"); },
    onError: () => toast.error("Could not reschedule"),
  });

  const cancelMut = useMutation({
    mutationFn: async (reason?: string) =>
      (await api.post(`/tech/appointments/${id}/cancel`, reason ? { reason } : {})).data,
    onSuccess: () => {
      invalidate();
      setShowCancel(false);
      toast.success("Booking cancelled");
    },
    onError: () => toast.error("Could not cancel booking"),
  });

  const noShowMut = useMutation({
    mutationFn: async () => (await api.patch(`/tech/appointments/${id}/no-show`)).data,
    onSuccess: () => { invalidate(); toast.success("Marked as no-show"); },
    onError: () => toast.error("Could not mark no-show"),
  });

  const depositLinkMut = useMutation({
    mutationFn: async () =>
      (await api.post<{ slug: string; url: string }>(`/tech/appointments/${id}/resend-deposit`)).data,
    onSuccess: (data) => {
      const url = data.url ?? `https://naildesk.app/pay/${data.slug}`;
      navigator.clipboard.writeText(url)
        .then(() => toast.success("Payment link copied to clipboard"))
        .catch(() => toast.success(`Payment link: ${url}`));
    },
    onError: () => toast.error("Could not get payment link"),
  });

  if (isLoading) return <div style={{ padding:20 }}><Skeleton style={{ height:300 }} /></div>;
  if (!data)    return <div style={{ padding:20, textAlign:"center" }}><p>Not found</p></div>;

  const name  = data.client?.fullName ?? data.clientName ?? "Client";
  const phone = data.client?.phone   ?? data.clientPhone;
  const svc   = data.service?.name   ?? data.serviceName ?? "Service";
  const price = data.price ?? data.service?.price;
  const isTerminal = TERMINAL.has(data.status);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
        <BackButton onClick={() => nav(-1)} />
        <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
      </div>

      <div style={{ padding:"20px 20px 0", display:"flex", flexDirection:"column", gap:10 }}>
        {/* Status + time */}
        <GlassCard style={{ padding:20 }} glow>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <StatusPill status={data.status} />
            {data.depositStatus === "PAID" && (
              <span className="label-mono" style={{ background:"var(--status-sage-bg)", color:"var(--status-sage-fg)", borderRadius:99, padding:"3px 10px" }}>Deposit paid</span>
            )}
          </div>
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:2 }}>Date &amp; time</p>
          <p className="serif" style={{ fontSize:28, fontWeight:400 }}>{fmt.date(data.startTime)}</p>
          <p style={{ fontSize:16, color:"var(--muted-foreground)", marginTop:2 }}>
            {fmt.time(data.startTime)}{data.endTime ? ` – ${fmt.time(data.endTime)}` : ""}
          </p>
        </GlassCard>

        {/* Client */}
        <GlassCard style={{ padding:"16px 20px" }}>
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:10 }}>Client</p>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Avatar initials={fmt.initials(name)} size={44} />
            <div style={{ flex:1 }}>
              <p style={{ fontSize:16, fontWeight:500 }}>{name}</p>
              {phone && <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>{phone}</p>}
            </div>
            {phone && (
              <a href={`tel:${phone}`} aria-label={`Call ${name}`}
                style={{ width:36, height:36, borderRadius:"50%", background:"var(--secondary)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", color:"var(--primary)" }}>
                <Phone size={16} />
              </a>
            )}
          </div>
        </GlassCard>

        {/* Service */}
        <GlassCard style={{ padding:"16px 20px" }}>
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:8 }}>Service</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:16, fontWeight:500 }}>{svc}</p>
              {data.service?.durationMinutes && (
                <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>{data.service.durationMinutes} min</p>
              )}
            </div>
            {price != null && (
              <span className="serif" style={{ fontSize:24, fontWeight:500 }}>{fmt.currency(Number(price))}</span>
            )}
          </div>
          {!!data.depositRequired && (
            <div style={{ marginTop:12, padding:"8px 12px", background:"var(--secondary)", borderRadius:"var(--radius)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:12, color:"var(--muted-foreground)" }}>Deposit required</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{fmt.currency(data.depositRequired)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:"var(--muted-foreground)" }}>Paid</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{fmt.currency(data.depositPaid ?? 0)}</span>
              </div>
            </div>
          )}
        </GlassCard>

        {data.notes && (
          <GlassCard style={{ padding:"16px 20px" }}>
            <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:6 }}>Notes</p>
            <p style={{ fontSize:14, fontWeight:300, lineHeight:1.5 }}>{data.notes}</p>
          </GlassCard>
        )}

        {/* Actions */}
        {!isTerminal && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <Button variant="gold" fullWidth loading={statusMut.isPending}
              onClick={() => statusMut.mutate({ status:"COMPLETED" })}>
              <CheckCircle2 size={16} /> Mark complete
            </Button>

            {data.status === "AWAITING_DEPOSIT" && (
              <>
                <Button variant="gold" fullWidth
                  style={{ background:"linear-gradient(135deg, oklch(0.72 0.12 155), oklch(0.55 0.10 160))", color:"#fff" }}
                  onClick={() => statusMut.mutate({ status:"CONFIRMED" })}>
                  <CheckCircle2 size={16} /> Confirm booking
                </Button>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Button variant="outline" loading={depositLinkMut.isPending}
                    onClick={() => depositLinkMut.mutate()}>
                    <Link2 size={15} /> Copy link
                  </Button>
                  <Button variant="outline" loading={depositLinkMut.isPending}
                    onClick={async () => {
                      const res = await depositLinkMut.mutateAsync().catch(() => null);
                      if (!res) return;
                      const url = res.url ?? `https://naildesk.app/pay/${res.slug}`;
                      if (navigator.share) {
                        navigator.share({ title:"Deposit payment", url }).catch(() => {});
                      } else {
                        window.open(url, "_blank");
                      }
                    }}>
                    <RefreshCw size={15} /> Resend
                  </Button>
                </div>
              </>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Button variant="outline" onClick={() => { setShowReschedule(!showReschedule); setShowCancel(false); }}>
                <RotateCcw size={15} /> Reschedule
              </Button>
              <Button variant="outline" loading={noShowMut.isPending}
                onClick={() => { if (confirm("Mark as no-show?")) noShowMut.mutate(); }}>
                <CalendarX size={15} /> No-show
              </Button>
            </div>

            <Button variant="danger" fullWidth onClick={() => { setShowCancel(!showCancel); setShowReschedule(false); }}>
              <XCircle size={16} /> Cancel booking
            </Button>

            {showCancel && (
              <GlassCard style={{ padding:16 }}>
                <p style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>Reason (optional)</p>
                <Textarea rows={2} placeholder="Reason for cancellation…" value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)} style={{ marginBottom:10 }} />
                <Button variant="danger" fullWidth loading={cancelMut.isPending}
                  onClick={() => cancelMut.mutate(cancelReason || undefined)}>
                  Confirm cancellation
                </Button>
              </GlassCard>
            )}

            {showReschedule && (
              <GlassCard style={{ padding:16 }}>
                <p style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>New date &amp; time</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                </div>
                <Button variant="gold" fullWidth loading={rescheduleMut.isPending} onClick={() => rescheduleMut.mutate()}>
                  Confirm reschedule
                </Button>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Appointment
// ─────────────────────────────────────────────────────────────────────────────
export function NewAppointmentPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [search, setSearch]         = useState("");
  const [clientId, setClientId]     = useState("");
  const [serviceId, setServiceId]   = useState("");
  const [date, setDate]             = useState(fmt.dateInput(new Date()));
  const [time, setTime]             = useState(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
  const [notes, setNotes]           = useState("");
  const [requireDeposit, setRequireDeposit] = useState(false);

  const clientsQ  = useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => (await api.get("/tech/clients", { params: { search: search || undefined } })).data,
    staleTime: 30_000,
  });
  const servicesQ = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => (await api.get("/tech/services")).data,
    staleTime: 60_000,
  });
  const subQ = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/tech/subscription/status")).data,
    staleTime: 60_000,
  });

  const svc    = servicesQ.data?.find((s) => s.id === serviceId);
  const slotsQ = useQuery({
    queryKey: ["slots", date, svc?.durationMinutes],
    queryFn: async () =>
      (await api.get("/tech/availability", { params: { date, duration: svc?.durationMinutes ?? 60, buffer:15 } })).data as Array<{ startTime:string; label?:string; available:boolean }>,
    enabled: !!date && !!serviceId,
    staleTime: 120_000,
  });
  const slots = useMemo(() => (slotsQ.data ?? []).filter((s) => s.available), [slotsQ.data]);

  const createMut = useMutation({
    mutationFn: async () =>
      (await api.post("/tech/appointments", {
        clientId, serviceId,
        startTime: fmt.localIso(date, time),
        notes: notes.trim() || undefined,
        requireDeposit,
      })).data,
    onSuccess: () => {
      toast.success("Booking saved 🎉");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      nav("/appointments");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Could not save booking"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId)  { toast.error("Select a client");  return; }
    if (!serviceId) { toast.error("Select a service"); return; }
    if (!date || !time) { toast.error("Set date & time"); return; }
    createMut.mutate();
  }

  const depositEnabled = subQ.data?.depositCollection ?? false;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
        <BackButton onClick={() => nav(-1)} />
        <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
      </div>
      <PageHeader eyebrow="Schedule" title="New booking" subtitle="Pick a client, service and time." />

      <form onSubmit={submit} noValidate style={{ padding:"0 20px" }}>
        {/* 1 – Client */}
        <section style={{ marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <p className="label-mono">1. Client</p>
            <Link to="/clients/new" style={{ fontSize:12, color:"var(--primary)", textDecoration:"none", fontWeight:500 }}>+ New client</Link>
          </div>
          <GlassCard style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
              style={{ background:"transparent", border:"none", outline:"none", fontSize:14, color:"var(--foreground)", width:"100%", padding:0 }} />
            {search && <button type="button" onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", fontSize:18, lineHeight:1 }}>×</button>}
          </GlassCard>
          <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {clientsQ.isLoading ? <Skeleton style={{ height:56 }} />
              : !(clientsQ.data?.length)
              ? <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>No clients found. <Link to="/clients/new" style={{ color:"var(--primary)" }}>Add one</Link>.</p>
              : (clientsQ.data ?? []).map((c) => (
                <button key={c.id} type="button" onClick={() => setClientId(c.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:"calc(var(--radius) + 4px)", border:`1.5px solid ${clientId===c.id?"var(--primary)":"var(--border)"}`, background: clientId===c.id?"var(--status-amber-bg)":"var(--card)", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <Avatar initials={fmt.initials(c.fullName)} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:500 }}>{c.fullName}</p>
                    <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>{c.phone}</p>
                  </div>
                  {clientId===c.id && <CheckCircle2 size={16} style={{ color:"var(--primary)", flexShrink:0 }} />}
                </button>
              ))
            }
          </div>
        </section>

        {/* 2 – Service */}
        <section style={{ marginBottom:20 }}>
          <p className="label-mono" style={{ marginBottom:8 }}>2. Service</p>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {servicesQ.isLoading ? <Skeleton style={{ height:60 }} />
              : (servicesQ.data ?? []).map((s) => (
                <button key={s.id} type="button" onClick={() => setServiceId(s.id)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:"calc(var(--radius)+4px)", border:`1.5px solid ${serviceId===s.id?"var(--primary)":"var(--border)"}`, background: serviceId===s.id?"var(--status-amber-bg)":"var(--card)", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:500 }}>{s.name}</p>
                    <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>{s.durationMinutes} min</p>
                  </div>
                  <span className="serif" style={{ fontSize:18, fontWeight:500 }}>{fmt.currency(Number(s.price))}</span>
                </button>
              ))
            }
          </div>
        </section>

        {/* 3 – Date & time */}
        <section style={{ marginBottom:20 }}>
          <p className="label-mono" style={{ marginBottom:8 }}>3. Date &amp; time</p>
          <FormField label="Date">
            <Input type="date" value={date} min={fmt.dateInput(new Date())} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          {slots.length > 0 ? (
            <div style={{ marginBottom:4 }}>
              <p className="label-mono" style={{ marginBottom:8, color:"var(--muted-foreground)" }}>Available slots</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                {slots.slice(0,12).map((sl) => {
                  const d  = new Date(sl.startTime);
                  const t  = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                  const on = time === t;
                  return (
                    <button key={sl.startTime} type="button" onClick={() => setTime(t)}
                      style={{ padding:"9px 4px", borderRadius:"var(--radius)", border:`1.5px solid ${on?"var(--primary)":"var(--border)"}`, background: on?"var(--primary)":"var(--card)", color: on?"var(--primary-foreground)":"var(--foreground)", cursor:"pointer", fontSize:13, fontWeight:500, transition:"all .15s" }}>
                      {sl.label ?? t}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <FormField label="Time">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
          )}
        </section>

        <FormField label="Notes (optional)">
          <Textarea rows={3} placeholder="Anything special to remember…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        {/* Deposit toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--card)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 16px", marginBottom:20, opacity: depositEnabled ? 1 : 0.6 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:500 }}>Require deposit</p>
            <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>
              {depositEnabled ? "Client must pay to confirm" : "Upgrade to Grow to collect deposits"}
            </p>
          </div>
          <Toggle checked={requireDeposit && depositEnabled} onChange={(v) => {
            if (!depositEnabled) { toast.info("Upgrade to Grow to collect deposits"); return; }
            setRequireDeposit(v);
          }} />
        </div>

        <Button type="submit" variant="gold" size="lg" fullWidth loading={createMut.isPending}>
          Save booking
        </Button>
      </form>
    </div>
  );
}
