import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, User, Building2, CalendarClock, Crown,
  AlertTriangle, LogOut, Plus, X, Zap, Bell, Sun, Moon, Monitor,
  Pencil, Calendar, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Profile, type Service, type Subscription, type AvailabilityWindow } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../lib/theme";
import { useNotifications } from "../stores/notifications";
import { openURL } from "../lib/capacitor";
import {
  GlassCard, Skeleton, Button, FormField, Input,
  Textarea, Select, PageHeader, BackButton, Avatar, Toggle,
} from "../components/ui";
import { fmt } from "../lib/fmt";

// ─────────────────────────────────────────────────────────────────────────────
// Availability types
// ─────────────────────────────────────────────────────────────────────────────
type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

interface WeeklySchedule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active: boolean;
}

const DAYS: DayOfWeek[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY:"Mon", TUESDAY:"Tue", WEDNESDAY:"Wed", THURSDAY:"Thu",
  FRIDAY:"Fri", SATURDAY:"Sat", SUNDAY:"Sun",
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings root
// ─────────────────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const nav     = useNavigate();
  const user    = useAuth((s) => s.user);
  const logout  = useAuth((s) => s.logout);

  const profileQ = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/tech/profile")).data,
    staleTime: 60_000,
  });
  const subQ = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/tech/subscription/status")).data,
    staleTime: 60_000,
  });

  const p      = profileQ.data;
  const sub    = subQ.data;
  const tier   = (p?.tier   ?? sub?.tier   ?? "FREE") as string;
  const status = (p?.subscriptionStatus ?? sub?.status ?? "TRIAL") as string;

  function doLogout() {
    if (!confirm("Sign out of NailDesk?")) return;
    logout();
    nav("/login");
  }

  const { theme, setTheme } = useTheme();
  const notifications  = useNotifications((s) => s.notifications);
  const unread         = useNotifications((s) => s.unreadCount);
  const markAllRead    = useNotifications((s) => s.markAllRead);
  const markRead       = useNotifications((s) => s.markRead);
  const clearNotifs    = useNotifications((s) => s.clear);
  const [showNotifs, setShowNotifs] = useState(false);

  const MENU = [
    { icon: User,          label:"Edit profile",            sub:"Name, business, address",   to:"/settings/profile" },
    { icon: Building2,     label:"Banking details",         sub:"For payouts",               to:"/settings/banking" },
    { icon: CalendarClock, label:"Availability",            sub:"Set working hours",         to:"/settings/availability" },
    { icon: Crown,         label:"Subscription",            sub:`${tier} · ${status}`,       to:"/settings/subscription" },
    { icon: AlertTriangle, label:"Emergency notification",  sub:"Alert clients if you can't make it", to:"/settings/emergency" },
  ] as const;

  const THEME_OPTIONS: Array<{ mode: ThemeMode; Icon: typeof Sun; label: string }> = [
    { mode:"light",  Icon: Sun,     label:"Light"  },
    { mode:"dark",   Icon: Moon,    label:"Dark"   },
    { mode:"system", Icon: Monitor, label:"System" },
  ];

  return (
      <div>
        {/* Header */}
        <div style={{ position:"relative", padding:"48px 20px 20px", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.72 0.12 55 / 0.09) 0%, transparent 100%)" }} />
          <div style={{ textAlign:"center", position:"relative" }}>
            <Avatar initials={fmt.initials(p?.fullName ?? user?.fullName)} size={72} />
            {profileQ.isLoading ? (
                <Skeleton style={{ height:26, width:160, margin:"14px auto 0" }} />
            ) : (
                <>
                  <h1 className="serif" style={{ fontSize:26, fontWeight:400, marginTop:14 }}>{p?.fullName}</h1>
                  <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>
                    {p?.businessName}{p?.mobile ? " · Mobile tech" : ""}
                  </p>
                  <SubBadge tier={tier} status={status} style={{ marginTop:8, display:"inline-flex" }} />
                </>
            )}
          </div>
        </div>

        <div style={{ padding:"0 20px" }}>
          {/* Services widget */}
          <p className="label-mono" style={{ marginBottom:8 }}>Your menu</p>
          <ServicesWidget />

          {/* Notifications section */}
          <p className="label-mono" style={{ marginTop:20, marginBottom:8 }}>Notifications</p>
          <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:12 }}>
            <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) setTimeout(markAllRead, 800); }}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <Bell size={18} style={{ color:"var(--muted-foreground)" }} />
                  {unread > 0 && (
                      <span style={{ position:"absolute", top:-5, right:-5, minWidth:16, height:16, borderRadius:8, background:"var(--primary)", color:"var(--primary-foreground)", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid var(--card)" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize:14, color:"var(--foreground)" }}>Notifications</p>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300 }}>
                    {unread > 0 ? `${unread} unread` : notifications.length === 0 ? "No notifications yet" : `${notifications.length} total`}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} style={{ color:"var(--muted-foreground)", transform: showNotifs ? "rotate(90deg)" : "none", transition:"transform .2s" }} />
            </button>

            {showNotifs && (
                <div style={{ borderTop:"1px solid var(--border)" }}>
                  {notifications.length === 0 ? (
                      <div style={{ padding:"20px 16px", textAlign:"center" }}>
                        <p className="serif" style={{ fontSize:18, fontStyle:"italic", color:"var(--muted-foreground)" }}>No notifications yet</p>
                        <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:4, fontWeight:300 }}>We'll ping you when clients book or pay.</p>
                      </div>
                  ) : (
                      <>
                        <div style={{ maxHeight:280, overflowY:"auto" }}>
                          {notifications.map((n, i) => (
                              <div key={n.id}
                                   onClick={() => markRead(n.id)}
                                   style={{ padding:"10px 16px", borderBottom: i < notifications.length-1 ? "1px solid var(--border)" : "none", cursor:"pointer", opacity: n.read ? 0.55 : 1, transition:"opacity .15s", background: n.read ? "transparent" : "oklch(0.72 0.12 55 / 0.04)" }}
                              >
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                          <span className="label-mono" style={{ background:"var(--muted)", color:"var(--muted-foreground)", padding:"2px 6px", borderRadius:99 }}>
                            {n.type === "DEPOSIT_RECEIVED" ? "Deposit" : n.type === "APPOINTMENT_CONFIRMED" ? "Confirmed" : "New booking"}
                          </span>
                                  <span style={{ fontFamily:"monospace", fontSize:10, color:"var(--muted-foreground)" }}>{fmt.time(n.createdAt)}</span>
                                </div>
                                <p style={{ fontSize:13, color:"var(--foreground)", fontWeight: n.read ? 400 : 600, lineHeight:1.4 }}>{n.message}</p>
                              </div>
                          ))}
                        </div>
                        <div style={{ padding:"8px 16px", borderTop:"1px solid var(--border)", display:"flex", gap:8 }}>
                          <button onClick={markAllRead} style={{ flex:1, padding:"7px", background:"var(--secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", cursor:"pointer", fontSize:12, color:"var(--muted-foreground)", fontWeight:500 }}>
                            Mark all read
                          </button>
                          <button onClick={() => { clearNotifs(); setShowNotifs(false); }} style={{ flex:1, padding:"7px", background:"var(--status-rose-bg)", border:"1px solid var(--status-rose-fg)/30", borderRadius:"var(--radius)", cursor:"pointer", fontSize:12, color:"var(--status-rose-fg)", fontWeight:500 }}>
                            Clear all
                          </button>
                        </div>
                      </>
                  )}
                </div>
            )}
          </GlassCard>

          {/* Appearance section */}
          <p className="label-mono" style={{ marginBottom:8 }}>Appearance</p>
          <GlassCard style={{ padding:"12px 16px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontSize:14, color:"var(--foreground)" }}>Colour mode</p>
                <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300 }}>
                  {theme === "system" ? "Follows your device" : theme === "dark" ? "Dark mode on" : "Light mode on"}
                </p>
              </div>
              <div style={{ display:"flex", alignItems:"center", background:"var(--muted)", borderRadius:99, padding:"3px" }}>
                {THEME_OPTIONS.map(({ mode, Icon, label }) => {
                  const on = theme === mode;
                  return (
                      <button key={mode} onClick={() => setTheme(mode)} aria-label={label} title={label}
                              style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", transition:"all .15s", background: on ? "var(--card)" : "transparent", color: on ? "var(--primary)" : "var(--muted-foreground)", boxShadow: on ? "0 1px 4px oklch(0 0 0 / .1)" : "none" }}>
                        <Icon size={15} strokeWidth={on ? 2.2 : 1.6} />
                      </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* Account links */}
          <p className="label-mono" style={{ marginBottom:8 }}>Account</p>
          <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:12 }}>
            {MENU.map(({ icon: Icon, label, sub, to }, i) => (
                <div key={to}
                     onClick={() => nav(to)}
                     style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom: i < MENU.length-1 ? "1px solid var(--border)" : "none", cursor:"pointer", transition:"background .15s" }}
                     onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                     onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <Icon size={18} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                    <div>
                      <p style={{ fontSize:14, color:"var(--foreground)" }}>{label}</p>
                      <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300 }}>{sub}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                </div>
            ))}
          </GlassCard>

          <GlassCard style={{ overflow:"hidden", padding:0 }}>
            <button onClick={doLogout}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
              <LogOut size={18} style={{ color:"var(--destructive)", flexShrink:0 }} />
              <span style={{ fontSize:14, color:"var(--destructive)", fontWeight:500 }}>Sign out</span>
            </button>
          </GlassCard>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Services widget
// ─────────────────────────────────────────────────────────────────────────────
function ServicesWidget() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ name:"", durationMinutes:60, price:0, requiresDeposit:false });

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => (await api.get("/tech/services")).data,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/tech/services", form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey:["services"] }); setAdding(false); toast.success("Service added"); },
    onError: () => toast.error("Could not add service"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["services"] }); toast.success("Removed"); },
    onError: () => toast.error("Could not remove"),
  });

  return (
      <>
        <GlassCard style={{ overflow:"hidden", padding:0 }}>
          {isLoading
              ? <Skeleton style={{ height:80, margin:16 }} />
              : (services ?? []).map((s, i, arr) => (
                  <div key={s.id}
                       style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:500 }}>{s.name}</p>
                      <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>{s.durationMinutes} min</p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <span className="serif" style={{ fontSize:18, fontWeight:500 }}>{fmt.currency(Number(s.price))}</span>
                      <button
                          onClick={() => { if (confirm(`Remove "${s.name}"?`)) deleteMut.mutate(s.id); }}
                          aria-label={`Remove ${s.name}`}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", alignItems:"center", padding:0 }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
              ))
          }
          <div style={{ padding:"10px 16px" }}>
            <button
                onClick={() => setAdding(!adding)}
                style={{ width:"100%", padding:"9px", border:"1px dashed var(--border)", borderRadius:"var(--radius)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--primary)", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Plus size={14} /> Add service
            </button>
          </div>
        </GlassCard>

        {adding && (
            <GlassCard style={{ padding:16, marginTop:8 }}>
              <FormField label="Service name">
                <Input placeholder="e.g. Gel manicure" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name:e.target.value }))} autoFocus />
              </FormField>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <FormField label="Duration (min)">
                  <Input type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes:Number(e.target.value) }))} />
                </FormField>
                <FormField label="Price (R)">
                  <Input type="number" value={form.price || ""} placeholder="0" onChange={(e) => setForm((f) => ({ ...f, price:Number(e.target.value) }))} />
                </FormField>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Button variant="gold" fullWidth loading={createMut.isPending} onClick={() => createMut.mutate()}>
                  Add service
                </Button>
                <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </GlassCard>
        )}
      </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile edit
// ─────────────────────────────────────────────────────────────────────────────
export function ProfileEditPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [form, setForm]     = useState<Partial<Profile>>({});

  useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get<Profile>("/tech/profile");
      if (!loaded) { setForm(data); setLoaded(true); }
      return data;
    },
    staleTime: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: async () => (await api.put("/tech/profile", form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey:["profile"] }); toast.success("Profile updated"); nav(-1); },
    onError: () => toast.error("Could not update profile"),
  });

  function set(k: string, v: string | boolean) { setForm((f) => ({ ...f, [k]:v })); }

  return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Account" title="Edit profile" />
        <div style={{ padding:"0 20px" }}>
          <GlassCard style={{ padding:20, marginBottom:16 }}>
            <FormField label="Full name">
              <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
            </FormField>
            <FormField label="Business name">
              <Input value={form.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} />
            </FormField>
            <FormField label="Salon address">
              <Input value={form.salonAddress ?? ""} onChange={(e) => set("salonAddress", e.target.value)} />
            </FormField>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0" }}>
              <div>
                <p style={{ fontSize:14, fontWeight:500 }}>Mobile technician</p>
                <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>I travel to clients</p>
              </div>
              <Toggle
                  checked={!!form.mobile}
                  onChange={(v) => set("mobile", v)}
              />
            </div>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
            Save changes
          </Button>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banking details
// ─────────────────────────────────────────────────────────────────────────────
export function BankingPage() {
  const nav  = useNavigate();
  const qc   = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [form, setForm]     = useState({ bankName:"", accountHolder:"", accountNumber:"", branchCode:"", accountType:"Cheque" });

  useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get<Profile>("/tech/profile");
      if (!loaded) {
        setForm({ bankName:data.bankName??"", accountHolder:data.accountHolder??"", accountNumber:data.accountNumber??"", branchCode:data.branchCode??"", accountType:data.accountType??"Cheque" });
        setLoaded(true);
      }
      return data;
    },
    staleTime: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: async () => (await api.put("/tech/profile", form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey:["profile"] }); toast.success("Banking details saved"); nav(-1); },
    onError: () => toast.error("Could not save"),
  });

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]:v })); }

  return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Account" title="Banking" subtitle="Your payout details. Kept secure." />
        <div style={{ padding:"0 20px" }}>
          <GlassCard style={{ padding:20, marginBottom:16 }}>
            <FormField label="Bank name">
              <Input placeholder="FNB, Standard Bank, Capitec…" value={form.bankName} onChange={(e) => set("bankName",e.target.value)} />
            </FormField>
            <FormField label="Account holder">
              <Input placeholder="Full name as on bank account" value={form.accountHolder} onChange={(e) => set("accountHolder",e.target.value)} />
            </FormField>
            <FormField label="Account number">
              <Input placeholder="10-digit account number" value={form.accountNumber} onChange={(e) => set("accountNumber",e.target.value)} />
            </FormField>
            <FormField label="Branch code">
              <Input placeholder="6-digit branch code" value={form.branchCode} onChange={(e) => set("branchCode",e.target.value)} />
            </FormField>
            <FormField label="Account type">
              <Select value={form.accountType} onChange={(e) => set("accountType",e.target.value)}>
                {["Cheque","Savings","Transmission"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
            Save banking details
          </Button>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability
// ─────────────────────────────────────────────────────────────────────────────
export function AvailabilityPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"weekly" | "dates">("weekly");

  return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Schedule" title="Availability" subtitle="Manage your working hours." />

        {/* Tab switcher */}
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ display:"flex", background:"var(--muted)", borderRadius:12, padding:3, gap:2 }}>
            {([["weekly","Weekly hours",RefreshCw],["dates","Special dates",Calendar]] as const).map(([key,label,Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                        style={{
                          flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                          padding:"8px 12px", border:"none", cursor:"pointer", borderRadius:10,
                          fontSize:13, fontWeight:500, transition:"all .15s",
                          background: tab===key ? "var(--card)" : "transparent",
                          color: tab===key ? "var(--foreground)" : "var(--muted-foreground)",
                          boxShadow: tab===key ? "0 1px 4px oklch(0 0 0 / .08)" : "none",
                        }}>
                  <Icon size={13} strokeWidth={tab===key ? 2.2 : 1.6} />
                  {label}
                </button>
            ))}
          </div>
        </div>

        {tab === "weekly" ? <WeeklyScheduleTab /> : <DateOverrideTab />}
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Schedule Tab
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyScheduleTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ dayOfWeek:"MONDAY" as DayOfWeek, startTime:"09:00", endTime:"17:00", active:true });

  const schedulesQ = useQuery<WeeklySchedule[]>({
    queryKey: ["weekly-schedules"],
    queryFn: async () => (await api.get("/tech/weekly-schedule")).data,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/tech/weekly-schedule", {
      ...form, startTime:`${form.startTime}:00`, endTime:`${form.endTime}:00`,
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey:["weekly-schedules"] }); toast.success("Schedule added"); resetForm(); },
    onError: (e: any) => {
      if (e?.response?.status === 409) toast.error("Overlaps with an existing slot on that day");
      else toast.error("Could not save schedule");
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => (await api.put(`/tech/weekly-schedule/${editingId}`, {
      ...form, startTime:`${form.startTime}:00`, endTime:`${form.endTime}:00`,
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey:["weekly-schedules"] }); toast.success("Schedule updated"); resetForm(); },
    onError: () => toast.error("Could not update schedule"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/weekly-schedule/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["weekly-schedules"] }); toast.success("Removed"); },
  });

  function resetForm() { setEditingId(null); setShowForm(false); setForm({ dayOfWeek:"MONDAY", startTime:"09:00", endTime:"17:00", active:true }); }

  function startEdit(s: WeeklySchedule) {
    setEditingId(s.id);
    setForm({ dayOfWeek:s.dayOfWeek, startTime:s.startTime.slice(0,5), endTime:s.endTime.slice(0,5), active:s.active });
    setShowForm(true);
  }

  const schedulesByDay = DAYS.reduce<Record<DayOfWeek, WeeklySchedule[]>>((acc, d) => ({ ...acc, [d]:[] }), {} as any);
  (schedulesQ.data ?? []).forEach((s) => schedulesByDay[s.dayOfWeek]?.push(s));

  return (
      <div style={{ padding:"0 20px" }}>
        <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:14 }}>
          Set recurring hours that repeat every week. Add exceptions under Special Dates.
        </p>

        {schedulesQ.isLoading ? (
            <Skeleton style={{ height:280, marginBottom:12 }} />
        ) : (
            <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:12 }}>
              {DAYS.map((day, i) => {
                const slots = schedulesByDay[day];
                return (
                    <div key={day} style={{ borderBottom: i < DAYS.length-1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display:"flex", alignItems:"center", padding:"12px 16px", gap:12 }}>
                        {/* Day label */}
                        <span style={{ width:36, fontSize:11, fontWeight:600, color:"var(--muted-foreground)", fontFamily:"monospace", flexShrink:0, textTransform:"uppercase", letterSpacing:.5 }}>
                    {DAY_SHORT[day]}
                  </span>

                        {/* Slots or OFF */}
                        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                          {slots.length === 0 ? (
                              <span style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>No hours set</span>
                          ) : slots.map((s) => (
                              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{
                          fontSize:12, fontFamily:"monospace", fontWeight:500,
                          color: s.active ? "var(--foreground)" : "var(--muted-foreground)",
                        }}>
                          {s.startTime.slice(0,5)} – {s.endTime.slice(0,5)}
                        </span>
                                <span style={{
                                  fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:600, fontFamily:"monospace",
                                  background: s.active ? "var(--status-sage-bg)" : "var(--muted)",
                                  color: s.active ? "var(--status-sage-fg)" : "var(--muted-foreground)",
                                }}>
                          {s.active ? "OPEN" : "OFF"}
                        </span>
                                <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
                                  <button onClick={() => startEdit(s)} aria-label="Edit"
                                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:4 }}>
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => { if (confirm("Remove this schedule?")) deleteMut.mutate(s.id); }} aria-label="Delete"
                                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:4 }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    </div>
                );
              })}
            </GlassCard>
        )}

        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                style={{ width:"100%", padding:"9px", border:"1px dashed var(--border)", borderRadius:"var(--radius)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--primary)", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:12 }}>
          <Plus size={14} /> Add time slot
        </button>

        {showForm && (
            <GlassCard style={{ padding:16, marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>{editingId ? "Edit slot" : "Add time slot"}</p>

              <FormField label="Day">
                <Select value={form.dayOfWeek}
                        onChange={(e) => setForm((f) => ({ ...f, dayOfWeek:e.target.value as DayOfWeek }))}
                        disabled={!!editingId}>
                  {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0)+d.slice(1).toLowerCase()}</option>)}
                </Select>
              </FormField>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <FormField label="Start time">
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime:e.target.value }))} />
                </FormField>
                <FormField label="End time">
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime:e.target.value }))} />
                </FormField>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0 14px" }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:500 }}>Active</p>
                  <p style={{ fontSize:11, color:"var(--muted-foreground)" }}>Clients can book during these hours</p>
                </div>
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active:v }))} />
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <Button variant="gold" fullWidth
                        loading={createMut.isPending || updateMut.isPending}
                        onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}>
                  {editingId ? "Update" : "Add slot"}
                </Button>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </GlassCard>
        )}
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Override Tab
// ─────────────────────────────────────────────────────────────────────────────
function DateOverrideTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<AvailabilityWindow[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [form, setForm] = useState({
    date: fmt.dateInput(new Date()),
    isDayOff: false,
    startTime: "09:00",
    endTime: "17:00",
  });

  // Fetch overrides for next 60 days on mount
  useEffect(() => {
    (async () => {
      setLoadingOverrides(true);
      const today = new Date();
      const all: AvailabilityWindow[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < 60; i++) {
        const d = new Date(today); d.setDate(d.getDate() + i);
        const ds = fmt.dateInput(d);
        try {
          const { data } = await api.get<AvailabilityWindow[]>("/tech/availability/windows", { params:{ date:ds } });
          for (const w of data) { if (!seen.has(w.id)) { seen.add(w.id); all.push(w); } }
        } catch {}
      }
      setOverrides(all.sort((a,b) => a.date.localeCompare(b.date)));
      setLoadingOverrides(false);
    })();
  }, []);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        date: form.date,
        startTime: form.isDayOff ? "00:00:01" : `${form.startTime}:00`,
        endTime:   form.isDayOff ? "00:00:01" : `${form.endTime}:00`,
        active: !form.isDayOff,
      };
      if (editingId) return (await api.put(`/tech/availability/${editingId}`, payload)).data;
      return (await api.post("/tech/availability", payload)).data;
    },
    onSuccess: () => {
      toast.success(editingId ? "Updated" : "Special date added");
      resetForm();
      // Reload overrides
      (async () => {
        setLoadingOverrides(true);
        const today = new Date();
        const all: AvailabilityWindow[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < 60; i++) {
          const d = new Date(today); d.setDate(d.getDate() + i);
          const ds = fmt.dateInput(d);
          try {
            const { data } = await api.get<AvailabilityWindow[]>("/tech/availability/windows", { params:{ date:ds } });
            for (const w of data) { if (!seen.has(w.id)) { seen.add(w.id); all.push(w); } }
          } catch {}
        }
        setOverrides(all.sort((a,b) => a.date.localeCompare(b.date)));
        setLoadingOverrides(false);
      })();
    },
    onError: () => toast.error("Could not save"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/availability/${id}`),
    onSuccess: (_, id) => { setOverrides((prev) => prev.filter((w) => w.id !== id)); toast.success("Removed"); },
  });

  function resetForm() { setEditingId(null); setShowForm(false); setForm({ date:fmt.dateInput(new Date()), isDayOff:false, startTime:"09:00", endTime:"17:00" }); }

  function startEdit(w: AvailabilityWindow) {
    setEditingId(w.id);
    const isDayOff = !w.active;
    setForm({ date:w.date, isDayOff, startTime:w.startTime.slice(0,5), endTime:w.endTime.slice(0,5) });
    setShowForm(true);
  }

  return (
      <div style={{ padding:"0 20px" }}>
        <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:14 }}>
          Override your weekly schedule for specific dates — days off, extended hours, special events.
        </p>

        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                style={{ width:"100%", padding:"9px", border:"1px dashed var(--border)", borderRadius:"var(--radius)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--primary)", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:12 }}>
          <Plus size={14} /> Add special date
        </button>

        {showForm && (
            <GlassCard style={{ padding:16, marginBottom:12 }}>
              <p style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>{editingId ? "Edit special date" : "Add special date"}</p>

              <FormField label="Date">
                <Input type="date" value={form.date} disabled={!!editingId}
                       onChange={(e) => setForm((f) => ({ ...f, date:e.target.value }))} />
              </FormField>

              {/* Day off toggle */}
              <div onClick={() => setForm((f) => ({ ...f, isDayOff:!f.isDayOff }))}
                   style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:12, borderRadius:"var(--radius)", border:`1.5px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, cursor:"pointer", background: form.isDayOff ? "var(--status-rose-bg)" : "transparent", transition:"all .15s" }}>
                <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, background: form.isDayOff ? "var(--status-rose-fg)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {form.isDayOff && <X size={11} style={{ color:"white" }} />}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:500, color: form.isDayOff ? "var(--status-rose-fg)" : "var(--foreground)" }}>Day off — no bookings</p>
                  <p style={{ fontSize:11, color:"var(--muted-foreground)", fontWeight:300 }}>Overrides your weekly schedule</p>
                </div>
              </div>

              {!form.isDayOff && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <FormField label="Start time">
                      <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime:e.target.value }))} />
                    </FormField>
                    <FormField label="End time">
                      <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime:e.target.value }))} />
                    </FormField>
                  </div>
              )}

              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <Button variant="gold" fullWidth loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
                  {editingId ? "Update" : "Save"}
                </Button>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </GlassCard>
        )}

        {loadingOverrides ? (
            <Skeleton style={{ height:160 }} />
        ) : overrides.length === 0 ? (
            <GlassCard style={{ padding:"24px 16px", textAlign:"center" }}>
              <p className="serif" style={{ fontSize:18, fontStyle:"italic", color:"var(--muted-foreground)" }}>No special dates yet</p>
              <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:4, fontWeight:300 }}>Add days off or extended hours above.</p>
            </GlassCard>
        ) : (
            <GlassCard style={{ overflow:"hidden", padding:0 }}>
              {overrides.map((w, i, arr) => {
                const isDayOff = !w.active;
                return (
                    <div key={w.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:500 }}>
                          {fmt.date(w.date + "T12:00:00", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
                        </p>
                        {isDayOff ? (
                            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:"var(--status-rose-bg)", color:"var(--status-rose-fg)", fontWeight:600, fontFamily:"monospace" }}>
                      DAY OFF
                    </span>
                        ) : (
                            <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>
                              {w.startTime.slice(0,5)} – {w.endTime.slice(0,5)}
                              <span style={{ marginLeft:6, fontSize:10, padding:"1px 6px", borderRadius:99, background:"var(--status-sage-bg)", color:"var(--status-sage-fg)", fontWeight:600, fontFamily:"monospace" }}>OPEN</span>
                            </p>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={() => startEdit(w)} aria-label="Edit"
                                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm("Remove this override?")) deleteMut.mutate(w.id); }} aria-label="Delete"
                                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                );
              })}
            </GlassCard>
        )}
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Subscription
// ─────────────────────────────────────────────────────────────────────────────
export function SubscriptionPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  // Keep the poll interval in a ref so it's cleaned up if the component unmounts
  // before payment is confirmed (avoids setState-on-unmounted-component and memory leak).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any running poll on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const { data: sub, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/tech/subscription/status")).data,
    staleTime: 60_000,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const response = await api.get<any[]>("/tech/subscription/plans");
      return response.data.sort((a, b) => {
        // Sort: FREE, GROW, PRO
        const order = { FREE: 0, GROW: 1, PRO: 2 };
        return (order[a.id as keyof typeof order] ?? 99) - (order[b.id as keyof typeof order] ?? 99);
      });
    },
    staleTime: Infinity, // Plans don't change often
  });

  async function upgrade(tier: string) {
    // The /upgrade endpoint only accepts GROW or PRO; FREE is display-only.
    if (tier === "FREE") return;

    setUpgrading(tier);
    try {
      const response = await api.post<{ paymentUrl?: string; message?: string }>("/tech/subscription/upgrade", { tier });
      const paymentUrl = response.data?.paymentUrl;

      if (paymentUrl) {
        toast.success("Opening PayFast payment...");

        await openURL(paymentUrl).catch((e) => {
          console.error("[Settings] Failed to open payment URL:", e);
          toast.error("Could not open payment page. Please try again.");
        });

        // Poll for payment confirmation every 2 s for up to 5 minutes.
        // Keep the interval ID in a ref so the cleanup effect can cancel it
        // if the user navigates away before the webhook fires.
        // Also: do NOT call setUpgrading(null) until confirmed (or timed out)
        // so the loading spinner stays visible while polling.
        const maxAttempts = 150;
        let attempts = 0;

        if (pollRef.current) clearInterval(pollRef.current); // clear any previous poll
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const { data: subStatus } = await api.get<Subscription>("/tech/subscription/status");
            if (subStatus?.tier === tier && subStatus?.status === "ACTIVE") {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              toast.success(`✅ Upgraded to ${tier} successfully!`);
              // Invalidate all subscription-related queries so every consumer refreshes
              qc.invalidateQueries({ queryKey: ["subscription"] });
              qc.invalidateQueries({ queryKey: ["subscription-plans"] });
              qc.invalidateQueries({ queryKey: ["profile"] });
              setUpgrading(null);
              return;
            }
          } catch (e) {
            console.error("[Settings] Error checking payment status:", e);
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            toast.info("Payment processing… you'll see the update shortly.");
            setUpgrading(null);
          }
        }, 2000);

        // Don't fall through to the finally block's setUpgrading(null)
        // while the poll is still running — return here.
        return;
      } else {
        toast.success("Upgrade initiated — you'll receive a payment link via WhatsApp.");
      }
    } catch (e) {
      const errMsg = (e as any)?.response?.data?.message ?? "Could not initiate upgrade";
      toast.error(errMsg);
    } finally {
      // Only clear the spinner if we're NOT in the polling path (poll manages it itself).
      if (!pollRef.current) setUpgrading(null);
    }
  }

  const currentTier = (sub?.tier ?? "FREE") as string;
  const isLoading = subLoading || plansLoading;

  return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Account" title="Subscription" subtitle="Choose the plan that fits your studio." />
        <div style={{ padding:"0 20px" }}>
          {/* Current status */}
          {subLoading ? <Skeleton style={{ height:110, marginBottom:16 }} /> : (
              <GlassCard style={{ padding:20, marginBottom:20 }} glow>
                <p className="label-mono" style={{ color:"var(--primary)", marginBottom:4 }}>Current plan</p>
                <h2 className="serif" style={{ fontSize:28, fontWeight:400 }}>{(sub as any)?.planName ?? currentTier}</h2>
                <SubBadge tier={currentTier} status={(sub?.status ?? "TRIAL") as string} style={{ marginTop:6 }} />
                {(sub?.status === "TRIAL") && sub?.trialDaysRemaining != null && (
                    <p style={{ fontSize:13, color:"var(--status-amber-fg)", marginTop:10, fontWeight:300 }}>
                      ⏳ {sub.trialDaysRemaining} day{sub.trialDaysRemaining !== 1 ? "s" : ""} left in trial
                    </p>
                )}
              </GlassCard>
          )}

          {/* Plan cards */}
          <p className="label-mono" style={{ marginBottom:12 }}>Upgrade your plan</p>
          {plansLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} style={{ height:260, marginBottom:12 }} />)
          ) : !plans || plans.length === 0 ? (
              <GlassCard style={{ padding:20, textAlign:"center" }}>
                <p style={{ color:"var(--muted-foreground)" }}>Could not load subscription plans.</p>
              </GlassCard>
          ) : (
              plans.map((plan) => {
                const isCurrent = currentTier === plan.id;
                return (
                    <GlassCard key={plan.id}
                               style={{ padding:16, marginBottom:10, border: isCurrent ? "1.5px solid var(--primary)" : "1px solid var(--border)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div>
                          <p style={{ fontSize:16, fontWeight:600 }}>{plan.name}</p>
                          <p className="serif" style={{ fontSize:20, fontWeight:400, color:"var(--primary)", marginTop:2 }}>
                            R {plan.price}/mo
                          </p>
                        </div>
                        {isCurrent
                            ? <span className="label-mono" style={{ background:"var(--status-sage-bg)", color:"var(--status-sage-fg)", borderRadius:99, padding:"3px 10px" }}>Current</span>
                            : null
                        }
                      </div>

                      {/* Limits summary */}
                      <div style={{ background:"var(--secondary)", borderRadius:"var(--radius)", padding:12, marginBottom:12, fontSize:12, color:"var(--muted-foreground)" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Bookings/month</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.monthlyBookingLimit}</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Services</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.serviceLimit}</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Portfolio images</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.portfolioImageLimit}</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Features</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>
                              {[
                                plan.depositCollection && "Deposits",
                                plan.waitlist && "Waitlist",
                                plan.analytics && "Analytics",
                                plan.whatsAppBot && "WhatsApp",
                              ].filter(Boolean).join(" • ") || "Basic"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Features list */}
                      <ul style={{ paddingLeft:0, listStyle:"none", display:"flex", flexDirection:"column", gap:4, marginBottom:isCurrent ? 0 : 12 }}>
                        {plan.features.map((f: string) => (
                            <li key={f} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>
                              <Zap size={12} style={{ color:"var(--primary)", flexShrink:0 }} /> {f}
                            </li>
                        ))}
                      </ul>
                      {!isCurrent && plan.id !== "FREE" && (
                          <Button variant="gold" fullWidth loading={upgrading === plan.id}
                                  onClick={() => upgrade(plan.id)}>
                            Upgrade to {plan.name}
                          </Button>
                      )}
                    </GlassCard>
                );
              })
          )}
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency
// ─────────────────────────────────────────────────────────────────────────────
const REASONS = [
  { value:"EMERGENCY",    label:"Emergency",    emoji:"🚨", desc:"Personal urgent matter" },
  { value:"SICK",         label:"Sick",         emoji:"🤒", desc:"Feeling unwell today" },
  { value:"LOAD_SHEDDING",label:"Load shedding",emoji:"🔌", desc:"Power outage in area" },
  { value:"OTHER",        label:"Other",        emoji:"❓", desc:"Something else came up" },
] as const;

type Reason = typeof REASONS[number]["value"];

export function EmergencyPage() {
  const nav = useNavigate();
  const [date, setDate]     = useState(fmt.dateInput(new Date()));
  const [reason, setReason] = useState<Reason>("SICK");
  const [message, setMsg]   = useState("");
  const [done, setDone]     = useState<{ clientCount: number } | null>(null);

  const sendMut = useMutation({
    mutationFn: async () =>
        (await api.post("/tech/emergency", { date, reason, message: message.trim() || undefined })).data,
    onSuccess: (data) => { setDone(data); toast.success(`${data.clientCount} clients notified`); },
    onError: () => toast.error("Could not send notification"),
  });

  if (done) {
    return (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
            <BackButton onClick={() => nav(-1)} />
          </div>
          <div style={{ padding:"40px 24px", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <h2 className="serif" style={{ fontSize:32, fontWeight:400 }}>Notifications sent</h2>
            <p style={{ fontSize:14, color:"var(--muted-foreground)", fontWeight:300, marginTop:8 }}>
              {done.clientCount} client{done.clientCount !== 1 ? "s" : ""} notified via WhatsApp.
            </p>
            <div style={{ marginTop:24 }}>
              <Button variant="gold" onClick={() => nav(-1)}>Done</Button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 20px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Alert" title="Emergency" subtitle="Notify all clients booked on a given day." />
        <div style={{ padding:"0 20px" }}>
          {/* Warning banner */}
          <GlassCard style={{ padding:"12px 16px", marginBottom:16, borderColor:"var(--status-rose-fg)", background:"var(--status-rose-bg)" }}>
            <p style={{ fontSize:13, color:"var(--status-rose-fg)", display:"flex", alignItems:"flex-start", gap:8, fontWeight:300 }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }} />
              This will send a WhatsApp message to all clients booked on the selected date.
            </p>
          </GlassCard>

          <FormField label="Affected date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>

          <p className="label-mono" style={{ marginBottom:10 }}>Reason</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
            {REASONS.map((r) => (
                <button key={r.value} type="button" onClick={() => setReason(r.value)}
                        style={{ padding:"12px 10px", border:`1.5px solid ${reason===r.value?"var(--primary)":"var(--border)"}`, borderRadius:"calc(var(--radius) + 4px)", background: reason===r.value?"var(--status-amber-bg)":"var(--card)", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <span style={{ fontSize:24, display:"block", marginBottom:4 }}>{r.emoji}</span>
                  <p style={{ fontSize:13, fontWeight:500 }}>{r.label}</p>
                  <p style={{ fontSize:11, color:"var(--muted-foreground)" }}>{r.desc}</p>
                </button>
            ))}
          </div>

          <FormField label="Custom message (optional)">
            <Textarea rows={3} placeholder="Apologies for the inconvenience…" value={message} onChange={(e) => setMsg(e.target.value)} />
          </FormField>

          <Button
              variant="danger"
              fullWidth
              loading={sendMut.isPending}
              onClick={() => sendMut.mutate()}
              style={{ borderRadius:"var(--radius)", height:48 }}
          >
            <AlertTriangle size={16} /> Send emergency notification
          </Button>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-badge helper
// ─────────────────────────────────────────────────────────────────────────────
function SubBadge({ tier, status, style }: { tier:string; status:string; style?: React.CSSProperties }) {
  const active  = status === "ACTIVE";
  const trial   = status === "TRIAL";
  const bg = active ? "var(--status-sage-bg)" : trial ? "var(--status-amber-bg)" : "var(--muted)";
  const fg = active ? "var(--status-sage-fg)" : trial ? "var(--status-amber-fg)" : "var(--muted-foreground)";
  return (
      <span className="label-mono"
            style={{ display:"inline-flex", alignItems:"center", gap:5, background:bg, color:fg, borderRadius:99, padding:"3px 10px", ...style }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor" }} />
        {tier}{trial ? " · Trial" : ""}
    </span>
  );
}