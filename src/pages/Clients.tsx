import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Phone, Search, X, ChevronRight, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { api, type Client } from "../lib/api";
import {
  GlassCard, Skeleton, Avatar, EmptyState, Button,
  FormField, Input, Textarea, PageHeader, BackButton,
} from "../components/ui";
import { fmt } from "../lib/fmt";

// ─────────────────────────────────────────────────────────────────────────────
// Clients List
// ─────────────────────────────────────────────────────────────────────────────
export function ClientsPage() {
  const nav     = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => {
      const res = await api.get<Client[] | { clients: Client[] }>("/tech/clients", { params: { search: search.trim() || undefined } });
      const responseData = res.data;
      return Array.isArray(responseData) ? responseData : (responseData as any)?.clients ?? [];
    },
    staleTime: 30_000,
  });

  return (
      <div style={{ maxWidth: "700px", margin: "0 auto", paddingBottom: "40px", position: "relative" }}>
        {/* Ambient Top Background Glow */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"320px", pointerEvents:"none", background:"radial-gradient(circle at 50% -20%, var(--primary-muted, rgba(var(--primary-rgb), 0.12)) 0%, transparent 70%)", zIndex: 0 }} />

        {/* Header */}
        <div style={{ position:"relative", padding:"48px 24px 16px", zIndex: 1 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap: 16 }}>
            <div>
              <p className="label-mono" style={{ color:"var(--primary)", marginBottom:4, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em" }}>People</p>
              <h1 className="serif" style={{ fontSize:32, fontWeight:400, letterSpacing: "-0.01em", lineHeight:1.1 }}>Clients</h1>
              <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:4 }}>Everyone who books with you.</p>
            </div>
            <button onClick={() => nav("/clients/new")} aria-label="Add client"
                    style={{ width:42, height:42, borderRadius:12, border:"none", cursor:"pointer", background:"var(--primary)", color:"var(--primary-foreground)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px var(--primary-muted)", flexShrink:0, transition: "transform 0.15s" }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding:"0 24px 16px", position: "relative", zIndex: 1 }}>
          <GlassCard style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", border: "1px solid var(--border)" }}>
            <Search size={16} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                style={{ background:"transparent", border:"none", outline:"none", fontSize:14, color:"var(--foreground)", width:"100%", padding:0 }}
            />
            {search && (
                <button type="button" onClick={() => setSearch("")}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", alignItems:"center" }}>
                  <X size={16} />
                </button>
            )}
          </GlassCard>
        </div>

        {/* List */}
        <div style={{ padding:"0 24px", position: "relative", zIndex: 1 }}>
          {isLoading ? (
              <GlassCard style={{ overflow:"hidden", padding:4, border: "1px solid var(--border)" }}>
                {[1,2,3,4].map((i) => <Skeleton key={i} style={{ height:64, margin:"8px 12px", borderRadius: 8 }} />)}
              </GlassCard>
          ) : !(clients?.length) ? (
              <EmptyState
                  title={search ? "No results" : "No clients yet"}
                  subtitle={search ? "Try a different name or number." : "Add your first client to get started."}
                  action={!search
                      ? <Button variant="gold" size="sm" onClick={() => nav("/clients/new")}>Add client</Button>
                      : undefined}
              />
          ) : (
              <GlassCard style={{ overflow:"hidden", padding:0, border: "1px solid var(--border)" }}>
                {clients.map((c, i) => (
                    <div key={c.id}
                         onClick={() => nav(`/clients/${c.id}`)}
                         style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom: i < clients.length-1 ? "1px solid var(--border)" : "none", cursor:"pointer", transition:"background .15s" }}
                         onMouseOver={(e) => (e.currentTarget.style.background="var(--secondary)")}
                         onMouseOut={(e) => (e.currentTarget.style.background="transparent")}
                    >
                      <Avatar initials={fmt.initials(c.fullName)} style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:15, fontWeight:500, color:"var(--foreground)" }}>{c.fullName}</p>
                        <p style={{ fontSize:13, color:"var(--muted-foreground)", display:"flex", alignItems:"center", gap:4, marginTop:3, fontWeight: 300 }}>
                          <Phone size={11} style={{ color: "var(--muted-foreground)", opacity: 0.8 }} />
                          {c.phone}
                        </p>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, paddingRight: 4 }}>
                        <p className="label-mono" style={{ color:"var(--primary)", fontSize: 11, fontWeight: 600 }}>{c.totalVisits ?? 0} visits</p>
                        {c.lastVisitDate && (
                            <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:3, fontWeight: 300 }}>
                              {fmt.date(c.lastVisitDate, { day:"numeric", month:"short" })}
                            </p>
                        )}
                      </div>
                      <ChevronRight size={15} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                    </div>
                ))}
              </GlassCard>
          )}
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Detail
// ─────────────────────────────────────────────────────────────────────────────
export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav    = useNavigate();
  const qc     = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<Partial<Client>>({});

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: async () => {
      const c = (await api.get<Client>(`/tech/clients/${id}`)).data;
      setForm(c);
      return c;
    },
  });

  const updateMut = useMutation({
    mutationFn: async () => (await api.put(`/tech/clients/${id}`, form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditing(false);
      toast.success("Client updated");
    },
    onError: () => toast.error("Could not update client"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => api.delete(`/tech/clients/${id}`),
    onSuccess: () => { toast.success("Client deleted"); nav("/clients"); },
    onError: () => toast.error("Could not delete"),
  });

  function set<K extends keyof Client>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (isLoading) return <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 24px" }}><Skeleton style={{ height:340, borderRadius: 12 }} /></div>;
  if (!client)   return null;

  return (
      <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* Toolbar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"52px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BackButton onClick={() => nav(-1)} />
            <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
          </div>
          <button
              onClick={() => setEditing(!editing)}
              style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"8px", padding:"8px 16px", cursor:"pointer", fontSize:13, color: editing ? "var(--primary)" : "var(--foreground)", fontWeight:600, transition:"all .15s", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            {editing ? "Cancel Edit" : "Edit Details"}
          </button>
        </div>

        <div style={{ padding:"24px 24px 0", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Profile card */}
          <GlassCard style={{ padding:"28px 20px", textAlign:"center", border: "1px solid var(--border)" }} glow>
            <Avatar initials={fmt.initials(client.fullName)} size={72} style={{ border: "3px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }} />
            <h2 className="serif" style={{ fontSize:30, fontWeight:400, marginTop:16, letterSpacing: "-0.01em" }}>{client.fullName}</h2>
            <p style={{ fontSize:14, color:"var(--muted-foreground)", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontWeight: 300 }}>
              <Phone size={13} style={{ opacity: 0.8 }} /> {client.phone}
            </p>
            <div style={{ display:"flex", justifyContent:"center", gap:36, marginTop:20, borderTop: "1px solid var(--border-muted)", paddingTop: 16 }}>
              <div style={{ textAlign:"center" }}>
                <p className="serif" style={{ fontSize:28, fontWeight:400, color:"var(--primary)" }}>{client.totalVisits ?? 0}</p>
                <p className="label-mono" style={{ color:"var(--muted-foreground)", marginTop:2, fontSize: 10, textTransform: "uppercase" }}>Total Visits</p>
              </div>
              {client.lastVisitDate && (
                  <div style={{ textAlign:"center" }}>
                    <p className="serif" style={{ fontSize:24, fontWeight:400, color:"var(--foreground)" }}>
                      {fmt.date(client.lastVisitDate, { day:"numeric", month:"short" })}
                    </p>
                    <p className="label-mono" style={{ color:"var(--muted-foreground)", marginTop:2, fontSize: 10, textTransform: "uppercase" }}>Last Visit</p>
                  </div>
              )}
            </div>
          </GlassCard>

          {/* Edit form */}
          {editing ? (
              <GlassCard style={{ padding:20, border: "1px solid var(--border)" }}>
                <h3 className="serif" style={{ fontSize:22, fontWeight:400, marginBottom:16, letterSpacing: "-0.01em" }}>Modify Client Record</h3>
                <FormField label="Full name">
                  <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
                </FormField>
                <FormField label="Phone">
                  <Input type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
                </FormField>
                <FormField label="Address">
                  <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
                </FormField>
                <FormField label="Allergies / sensitivities">
                  <Textarea rows={2} value={form.allergies ?? ""} onChange={(e) => set("allergies", e.target.value)} />
                </FormField>
                <FormField label="Preferences">
                  <Textarea rows={2} value={form.preferences ?? ""} onChange={(e) => set("preferences", e.target.value)} />
                </FormField>
                <FormField label="Notes">
                  <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
                </FormField>
                <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
                  Save changes
                </Button>
                <div style={{ marginTop:10 }}>
                  <Button variant="danger" fullWidth
                          onClick={() => { if (confirm(`Delete ${client.fullName}? This cannot be undone.`)) deleteMut.mutate(); }}>
                    Delete client profile
                  </Button>
                </div>
              </GlassCard>
          ) : (
              <>
                {/* Health info */}
                {(client.allergies || client.preferences || client.notes) && (
                    <GlassCard style={{ padding:"18px 20px", border: "1px solid var(--border)" }}>
                      {client.allergies && (
                          <div style={{ marginBottom:client.preferences || client.notes ? 16 : 0 }}>
                            <p className="label-mono" style={{ color:"var(--status-rose-fg)", marginBottom:5, fontSize: 10, fontWeight: 600 }}>⚠ Allergies &amp; Sensitivities</p>
                            <p style={{ fontSize:14, fontWeight:300, lineHeight:1.5 }}>{client.allergies}</p>
                          </div>
                      )}
                      {client.preferences && (
                          <div style={{ marginBottom:client.notes ? 16 : 0 }}>
                            <p className="label-mono" style={{ color:"var(--primary)", marginBottom:5, fontSize: 10, fontWeight: 600 }}>Client Preferences</p>
                            <p style={{ fontSize:14, fontWeight:300, lineHeight:1.5 }}>{client.preferences}</p>
                          </div>
                      )}
                      {client.notes && (
                          <div>
                            <p className="label-mono" style={{ color:"var(--muted-foreground)", marginBottom:5, fontSize: 10, fontWeight: 600 }}>Internal Notes</p>
                            <p style={{ fontSize:14, fontWeight:300, lineHeight:1.5 }}>{client.notes}</p>
                          </div>
                      )}
                    </GlassCard>
                )}

                {/* CTA */}
                <Button variant="gold" size="lg" fullWidth style={{ height: 50, fontWeight: 600 }}
                        onClick={() => nav(`/appointments/new?clientId=${client.id}`)}>
                  <CalendarPlus size={16} />
                  New booking for {client.fullName?.split(" ")[0]}
                </Button>
              </>
          )}
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New Client
// ─────────────────────────────────────────────────────────────────────────────
export function NewClientPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [form, setForm] = useState({
    phone:"", fullName:"", address:"", allergies:"", preferences:"", notes:"",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/tech/clients", form)).data,
    onSuccess: (data: Client) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client added 🎉");
      nav(`/clients/${data.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Could not add client"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error("Name is required"); return; }
    createMut.mutate();
  }

  return (
      <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="People" title="New client" subtitle="Add someone to your client list registry." />

        <form onSubmit={submit} noValidate style={{ padding:"0 24px" }}>
          <GlassCard style={{ padding:20, marginBottom:14, border: "1px solid var(--border)" }}>
            <FormField label="Full name" required>
              <Input placeholder="Nomsa Dlamini" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoFocus />
            </FormField>
            <FormField label="Phone number">
              <Input type="tel" placeholder="+27 82 123 4567" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </FormField>
            <FormField label="Address">
              <Input placeholder="Street, suburb, city" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </FormField>
          </GlassCard>

          <GlassCard style={{ padding:20, marginBottom:20, border: "1px solid var(--border)" }}>
            <h3 className="serif" style={{ fontSize:20, fontWeight:400, marginBottom:14, letterSpacing: "-0.01em" }}>Health &amp; notes</h3>
            <FormField label="Allergies / sensitivities">
              <Textarea rows={2} placeholder="e.g. latex, acrylic monomer…" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
            </FormField>
            <FormField label="Preferences">
              <Textarea rows={2} placeholder="e.g. prefers gel, no glitter…" value={form.preferences} onChange={(e) => set("preferences", e.target.value)} />
            </FormField>
            <FormField label="Internal notes">
              <Textarea rows={2} placeholder="Anything to remember…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </FormField>
          </GlassCard>

          <Button type="submit" variant="gold" size="lg" fullWidth loading={createMut.isPending} style={{ height: 50, fontWeight: 600 }}>
            Save client profile
          </Button>
        </form>
      </div>
  );
}
