import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, User, Building2, CalendarClock, Crown,
  AlertTriangle, LogOut, Plus, X, Bell, Sun, Moon, Monitor,
  Pencil, Calendar, RefreshCw, Camera, ImageIcon, Star, EyeOff, Eye, Check, Scissors
} from "lucide-react";
import { toast } from "sonner";
import { api, type Profile, type Service, type Subscription, type SubscriptionPlan, type AvailabilityWindow, type PortfolioImage, uploadImage, formatLimit } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../lib/theme";
import { openURL } from "../lib/capacitor";
import {
  GlassCard, Skeleton, Button, FormField, Input,
  Textarea, Select, PageHeader, BackButton, Avatar, Toggle,
} from "../components/ui";
import { fmt } from "../lib/fmt";

type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

interface WeeklySchedule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active: boolean;
}

interface TechReview {
  id: string;
  clientName: string;
  rating: number;
  comment?: string;
  hidden: boolean;
  createdAt: string;
}

const DAYS: DayOfWeek[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY:"Mon", TUESDAY:"Tue", WEDNESDAY:"Wed", THURSDAY:"Thu",
  FRIDAY:"Fri", SATURDAY:"Sat", SUNDAY:"Sun",
};

// ── Section label ─────────────────────────────────────────────────────────────
function Section({ label }: { label: string }) {
  return (
      <p style={{
        fontFamily: "SF Mono, ui-monospace, monospace",
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--muted-foreground)", margin: "28px 0 10px",
      }}>
        {label}
      </p>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({
                   icon: Icon, label, sub, onClick, danger,
                 }: {
  icon: React.ElementType; label: string; sub?: string; onClick: () => void; danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
      <div
          onClick={onClick}
          onMouseOver={() => setHov(true)}
          onMouseOut={() => setHov(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", cursor: "pointer",
            background: hov ? "var(--muted)" : "transparent",
            transition: "background .12s",
          }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: danger ? "var(--status-rose-bg)" : "var(--muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} style={{ color: danger ? "var(--status-rose-fg)" : "var(--muted-foreground)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: danger ? "var(--destructive)" : "var(--foreground)", margin: 0 }}>{label}</p>
          {sub && <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "1px 0 0" }}>{sub}</p>}
        </div>
        {!danger && <ChevronRight size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />;
}

export function SettingsPage() {
  const nav    = useNavigate();
  const user   = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

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

  const { theme, setTheme } = useTheme();

  const MENU = [
    { icon: Scissors,      label: "Business",               sub: "Services, portfolio & reviews",  to: "/settings/business" },
    { icon: User,          label: "Edit profile",           sub: "Name, business, address",        to: "/settings/profile" },
    { icon: Building2,     label: "Banking details",        sub: "Payout bank account",            to: "/settings/banking" },
    { icon: CalendarClock, label: "Availability",           sub: "Set your working hours",         to: "/settings/availability" },
    { icon: Crown,         label: "Subscription",           sub: `${tier} · ${status}`,            to: "/settings/subscription" },
    { icon: AlertTriangle, label: "Emergency",              sub: "Alert clients if you can't make it", to: "/settings/emergency" },
  ] as const;

  const THEME_OPTIONS: Array<{ mode: ThemeMode; Icon: typeof Sun; label: string }> = [
    { mode: "light",  Icon: Sun,     label: "Light"  },
    { mode: "dark",   Icon: Moon,    label: "Dark"   },
    { mode: "system", Icon: Monitor, label: "System" },
  ];

  function doLogout() {
    if (!confirm("Sign out of NailDesk?")) return;
    logout();
    nav("/login");
  }

  return (
      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 48, position: "relative" }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.68 0.10 350 / 0.07) 0%, transparent 100%)" }} />

        {/* Profile hero */}
        <div style={{ position: "relative", zIndex: 1, padding: "52px 24px 0", textAlign: "center" }}>
          <Avatar
              initials={fmt.initials(p?.fullName ?? user?.fullName)}
              size={72}
              style={{ border: "3px solid var(--border)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.08)" }}
          />
          {profileQ.isLoading ? (
              <Skeleton style={{ height: 24, width: 140, margin: "16px auto 0" }} />
          ) : (
              <>
                <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "14px 0 4px" }}>{p?.fullName}</h1>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                  {p?.businessName}{p?.mobile ? " · Mobile tech" : ""}
                </p>
                <SubBadge tier={tier} status={status} style={{ marginTop: 10, display: "inline-flex" }} />
              </>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "0 20px", position: "relative", zIndex: 1 }}>

          <Section label="Appearance" />
          <GlassCard style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Colour mode</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                  {theme === "system" ? "Follows device setting" : theme === "dark" ? "Dark" : "Light"}
                </p>
              </div>
              <div style={{ display: "flex", background: "var(--muted)", borderRadius: 99, padding: 3, gap: 2 }}>
                {THEME_OPTIONS.map(({ mode, Icon, label }) => {
                  const on = theme === mode;
                  return (
                      <button key={mode} onClick={() => setTheme(mode)} aria-label={label} title={label}
                              style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", transition: "all .15s", background: on ? "var(--card)" : "transparent", color: on ? "var(--primary)" : "var(--muted-foreground)", boxShadow: on ? "0 2px 6px oklch(0 0 0 / 0.1)" : "none" }}>
                        <Icon size={15} strokeWidth={on ? 2.2 : 1.6} />
                      </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          <Section label="Account" />
          <GlassCard style={{ overflow: "hidden", padding: 0 }}>
            {MENU.map(({ icon, label, sub, to }, i) => (
                <div key={to}>
                  <MenuRow icon={icon} label={label} sub={sub} onClick={() => nav(to)} />
                  {i < MENU.length - 1 && <Divider />}
                </div>
            ))}
          </GlassCard>

          <div style={{ marginTop: 12 }}>
            <GlassCard style={{ overflow: "hidden", padding: 0 }}>
              <MenuRow icon={LogOut} label="Sign out" onClick={doLogout} danger />
            </GlassCard>
          </div>

        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Business (Services / Portfolio / Reviews)
// ─────────────────────────────────────────────────────────────────────────────
export function BusinessPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"services" | "portfolio" | "reviews">("services");

  return (
      <div style={{ maxWidth: 700, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Business" title="Business" subtitle="Manage your services, portfolio, and client reviews." />

        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 12, padding: 4, gap: 4 }}>
            {([["services","Services",Scissors],["portfolio","Portfolio",ImageIcon],["reviews","Reviews",Star]] as const).map(([key,label,Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 13, fontWeight: 600, transition: "all .15s", background: tab === key ? "var(--card)" : "transparent", color: tab === key ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === key ? "0 2px 6px oklch(0 0 0 / 0.06)" : "none" }}>
                  <Icon size={14} strokeWidth={tab === key ? 2.2 : 1.6} />
                  {label}
                </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 24px" }}>
          {tab === "services" && <ServicesWidget />}
          {tab === "portfolio" && <PortfolioWidget />}
          {tab === "reviews" && <ReviewsWidget />}
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────────────────────
function ReviewsWidget() {
  const qc = useQueryClient();

  const { data: reviews, isLoading } = useQuery<TechReview[]>({
    queryKey: ["tech-reviews"],
    queryFn: async () => (await api.get("/tech/reviews")).data,
    staleTime: 60_000,
  });

  const hideMut = useMutation({
    mutationFn: async (id: string) => api.patch(`/tech/reviews/${id}/hide`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tech-reviews"] }); toast.success("Visibility updated"); },
    onError: () => toast.error("Could not update review"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tech-reviews"] }); toast.success("Review removed"); },
    onError: () => toast.error("Could not remove review"),
  });

  return (
      <GlassCard style={{ overflow: "hidden", padding: 0, marginBottom: 4 }}>
        {isLoading ? (
            <Skeleton style={{ height: 80, margin: 16 }} />
        ) : !reviews?.length ? (
            <div style={{ padding: "28px 20px", textAlign: "center" }}>
              <p className="serif" style={{ fontSize: 17, fontStyle: "italic", color: "var(--muted-foreground)", margin: 0 }}>No reviews yet</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "6px 0 0" }}>Clients can leave reviews from your public portfolio page.</p>
            </div>
        ) : reviews.map((r, i) => (
            <div key={r.id} style={{ padding: "14px 16px", borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none", opacity: r.hidden ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{r.clientName}</p>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                          <Star key={s} size={11} fill={r.rating >= s ? "var(--status-amber-fg)" : "none"} color={r.rating >= s ? "var(--status-amber-fg)" : "var(--border)"} />
                      ))}
                    </div>
                    {r.hidden && (
                        <span style={{ fontFamily: "SF Mono, monospace", fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "var(--muted)", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hidden</span>
                    )}
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>"{r.comment}"</p>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => hideMut.mutate(r.id)} aria-label={r.hidden ? "Show" : "Hide"} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 6, display: "flex" }}>
                    {r.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => { if (confirm("Remove this review?")) deleteMut.mutate(r.id); }} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 6, display: "flex" }}>
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
        ))}
      </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioWidget() {
  const qc      = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption]     = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const { data: images, isLoading } = useQuery<PortfolioImage[]>({
    queryKey: ["portfolio"],
    queryFn: async () => (await api.get("/tech/portfolio")).data,
    staleTime: 60_000,
  });

  const uploadMut = useMutation({
    mutationFn: async (imageUrl: string) =>
        (await api.post("/tech/portfolio", { imageUrl, caption: caption.trim() || undefined })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      setShowForm(false); setCaption(""); setPreviewUrl("");
      toast.success("Photo added");
    },
    onError: () => toast.error("Could not add photo"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/portfolio/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portfolio"] }); toast.success("Removed"); },
    onError: () => toast.error("Could not remove"),
  });

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { secureUrl } = await uploadImage(file);
      setPreviewUrl(secureUrl);
    } catch { toast.error("Upload failed"); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
      <>
        <GlassCard style={{ overflow: "hidden", padding: 0, marginBottom: 4 }}>
          {isLoading ? (
              <Skeleton style={{ height: 80, margin: 16 }} />
          ) : !(images ?? []).length ? (
              <div style={{ padding: "28px 20px", textAlign: "center" }}>
                <p className="serif" style={{ fontSize: 17, fontStyle: "italic", color: "var(--muted-foreground)", margin: 0 }}>No photos yet</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "6px 0 0" }}>Add your recent work to showcase before clients book.</p>
              </div>
          ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: 8 }}>
                {(images ?? []).map((img) => (
                    <div key={img.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <img src={img.imageUrl} alt={img.caption || "Portfolio"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <button
                          onClick={() => { if (confirm("Remove this photo?")) deleteMut.mutate(img.id); }}
                          aria-label="Remove photo"
                          style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                      >
                        <X size={12} />
                      </button>
                      {img.caption && (
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "10px 7px 5px", fontSize: 10, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {img.caption}
                          </div>
                      )}
                    </div>
                ))}
              </div>
          )}
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePickImage} />
            <button
                onClick={() => { setShowForm(true); fileRef.current?.click(); }}
                style={{ width: "100%", padding: "9px", border: "1px dashed var(--border)", borderRadius: 8, background: "transparent", cursor: uploading ? "wait" : "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Camera size={14} /> {uploading ? "Uploading…" : "Add photo"}
            </button>
          </div>
        </GlassCard>

        {showForm && previewUrl && (
            <GlassCard style={{ padding: 16, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
                <img src={previewUrl} alt="Preview" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid var(--border)" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Caption (optional)</p>
                  <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Bio-gel overlay" className="nd-input" style={{ fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => { setShowForm(false); setPreviewUrl(""); setCaption(""); }}>Cancel</Button>
                <Button variant="gold" loading={uploadMut.isPending} onClick={() => uploadMut.mutate(previewUrl)}>Save photo</Button>
              </div>
            </GlassCard>
        )}
      </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────────────────
function ServicesWidget() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm]           = useState({ name: "", durationMinutes: 60, price: 0, requiresDeposit: false, imageUrl: "" });
  const emptyForm = { name: "", durationMinutes: 60, price: 0, requiresDeposit: false, imageUrl: "" };

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => (await api.get("/tech/services")).data,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/tech/services", form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setAdding(false); setForm(emptyForm); toast.success("Service added"); },
    onError: () => toast.error("Could not add service"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast.success("Removed"); },
    onError: () => toast.error("Could not remove"),
  });

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { secureUrl } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: secureUrl }));
      toast.success("Photo attached");
    } catch { toast.error("Upload failed"); } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
      <>
        <GlassCard style={{ overflow: "hidden", padding: 0, marginBottom: 4 }}>
          {isLoading ? (
              <Skeleton style={{ height: 80, margin: 16 }} />
          ) : (services ?? []).map((s, i, arr) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: "var(--muted)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                  {s.imageUrl ? <img src={s.imageUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color="var(--muted-foreground)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{s.durationMinutes} min</p>
                </div>
                <span className="serif" style={{ fontSize: 17, fontWeight: 400, flexShrink: 0 }}>{fmt.currency(Number(s.price))}</span>
                <button onClick={() => { if (confirm(`Remove "${s.name}"?`)) deleteMut.mutate(s.id); }} aria-label={`Remove ${s.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}>
                  <X size={15} />
                </button>
              </div>
          ))}
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <button
                onClick={() => setAdding(!adding)}
                style={{ width: "100%", padding: "9px", border: "1px dashed var(--border)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Plus size={14} /> Add service
            </button>
          </div>
        </GlassCard>

        {adding && (
            <GlassCard style={{ padding: 20, marginTop: 8 }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Cover image (optional)</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 58, height: 58, borderRadius: 8, background: "var(--muted)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                    {form.imageUrl ? <img src={form.imageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={20} color="var(--muted-foreground)" />}
                  </div>
                  <div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePickImage} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card)", cursor: uploading ? "wait" : "pointer", fontSize: 12, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                      <Camera size={13} /> {uploading ? "Uploading…" : form.imageUrl ? "Change photo" : "Upload photo"}
                    </button>
                    {form.imageUrl && <button onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} style={{ padding: "4px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--destructive)", marginTop: 4 }}>Remove</button>}
                  </div>
                </div>
              </div>
              <FormField label="Service name">
                <Input placeholder="e.g. Luxury gel pedicure" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Duration (min)">
                  <Input type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Price (R)">
                  <Input type="number" value={form.price || ""} placeholder="0" onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                </FormField>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <Button variant="ghost" onClick={() => { setAdding(false); setForm(emptyForm); }}>Cancel</Button>
                <Button variant="gold" loading={createMut.isPending || uploading} onClick={() => createMut.mutate()}>Add service</Button>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profile updated"); nav(-1); },
    onError: () => toast.error("Could not update profile"),
  });

  function set(k: string, v: string | boolean) { setForm((f) => ({ ...f, [k]: v })); }

  return (
      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Account" title="Edit profile" />
        <div style={{ padding: "0 24px" }}>
          <GlassCard style={{ padding: 20, marginBottom: 20 }}>
            <FormField label="Full name">
              <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
            </FormField>
            <FormField label="Business name">
              <Input value={form.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} />
            </FormField>
            <FormField label="Salon address">
              <Input value={form.salonAddress ?? ""} onChange={(e) => set("salonAddress", e.target.value)} />
            </FormField>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 6px", borderTop: "1px solid var(--border)", marginTop: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500 }}>Mobile technician</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>I travel to clients' homes</p>
              </div>
              <Toggle checked={!!form.mobile} onChange={(v) => set("mobile", v)} />
            </div>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>Save changes</Button>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banking
// ─────────────────────────────────────────────────────────────────────────────
export function BankingPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [form, setForm]     = useState({ bankName: "", accountHolder: "", accountNumber: "", branchCode: "", accountType: "Cheque" });

  const profileQ = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get<Profile>("/tech/profile")).data,
    staleTime: 60_000,
  });

  useEffect(() => {
    const data = profileQ.data;
    if (!data || loaded) return;
    setForm({ bankName: data.bankName ?? "", accountHolder: data.accountHolder ?? "", accountNumber: data.accountNumber ?? "", branchCode: data.branchCode ?? "", accountType: data.accountType ?? "Cheque" });
    setLoaded(true);
  }, [profileQ.data, loaded]);

  const updateMut = useMutation({
    mutationFn: async () => (await api.put("/tech/profile", form)).data,
    onSuccess: (data) => {
      qc.setQueryData<Profile>(["profile"], (old) => ({ ...(old ?? data), ...data, ...form, hasBankingDetails: true }));
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Banking details saved");
      nav(-1);
    },
    onError: () => toast.error("Could not save"),
  });

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  return (
      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Finance" title="Banking details" subtitle="Your payout account — kept encrypted." />
        <div style={{ padding: "0 24px" }}>
          <GlassCard style={{ padding: 20, marginBottom: 20 }}>
            <FormField label="Bank name">
              <Input placeholder="FNB, Standard Bank, Capitec…" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </FormField>
            <FormField label="Account holder">
              <Input placeholder="Full name as on statement" value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} />
            </FormField>
            <FormField label="Account number">
              <Input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
            </FormField>
            <FormField label="Branch code">
              <Input value={form.branchCode} onChange={(e) => set("branchCode", e.target.value)} />
            </FormField>
            <FormField label="Account type">
              <Select value={form.accountType} onChange={(e) => set("accountType", e.target.value)}>
                {["Cheque","Savings","Transmission"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>Save banking details</Button>
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
      <div style={{ maxWidth: 700, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Calendar" title="Availability" subtitle="Set when clients can book with you." />

        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 12, padding: 4, gap: 4 }}>
            {([["weekly","Weekly schedule",RefreshCw],["dates","Date overrides",Calendar]] as const).map(([key,label,Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 13, fontWeight: 600, transition: "all .15s", background: tab === key ? "var(--card)" : "transparent", color: tab === key ? "var(--foreground)" : "var(--muted-foreground)", boxShadow: tab === key ? "0 2px 6px oklch(0 0 0 / 0.06)" : "none" }}>
                  <Icon size={14} strokeWidth={tab === key ? 2.2 : 1.6} />
                  {label}
                </button>
            ))}
          </div>
        </div>

        {tab === "weekly" ? <WeeklyScheduleTab /> : <DateOverrideTab />}
      </div>
  );
}

function WeeklyScheduleTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ dayOfWeek: "MONDAY" as DayOfWeek, startTime: "09:00", endTime: "17:00", active: true });

  const schedulesQ = useQuery<WeeklySchedule[]>({
    queryKey: ["weekly-schedules"],
    queryFn: async () => (await api.get("/tech/weekly-schedule")).data,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/tech/weekly-schedule", { ...form, startTime: `${form.startTime}:00`, endTime: `${form.endTime}:00` })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weekly-schedules"] }); toast.success("Schedule added"); resetForm(); },
    onError: (e: any) => { if (e?.response?.status === 409) toast.error("Overlaps an existing slot"); else toast.error("Could not save"); },
  });

  const updateMut = useMutation({
    mutationFn: async () => (await api.put(`/tech/weekly-schedule/${editingId}`, { ...form, startTime: `${form.startTime}:00`, endTime: `${form.endTime}:00` })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weekly-schedules"] }); toast.success("Updated"); resetForm(); },
    onError: () => toast.error("Could not update"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/weekly-schedule/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weekly-schedules"] }); toast.success("Removed"); },
  });

  function resetForm() { setEditingId(null); setShowForm(false); setForm({ dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00", active: true }); }
  function startEdit(s: WeeklySchedule) { setEditingId(s.id); setForm({ dayOfWeek: s.dayOfWeek, startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5), active: s.active }); setShowForm(true); }

  const schedulesByDay = DAYS.reduce<Record<DayOfWeek, WeeklySchedule[]>>((acc, d) => ({ ...acc, [d]: [] }), {} as any);
  (schedulesQ.data ?? []).forEach((s) => schedulesByDay[s.dayOfWeek]?.push(s));

  return (
      <div style={{ padding: "0 24px" }}>
        {schedulesQ.isLoading ? <Skeleton style={{ height: 280, marginBottom: 16 }} /> : (
            <GlassCard style={{ overflow: "hidden", padding: 0, marginBottom: 16 }}>
              {DAYS.map((day, i) => {
                const slots = schedulesByDay[day];
                return (
                    <div key={day} style={{ borderBottom: i < DAYS.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 14 }}>
                        <span style={{ fontFamily: "SF Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", width: 36, fontWeight: 600, color: "var(--primary)", flexShrink: 0 }}>{DAY_SHORT[day]}</span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                          {slots.length === 0 ? (
                              <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>Closed</span>
                          ) : slots.map((s) => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 13, fontFamily: "SF Mono, monospace", fontWeight: 500, color: s.active ? "var(--foreground)" : "var(--muted-foreground)" }}>{s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}</span>
                                <span style={{ fontFamily: "SF Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 600, background: s.active ? "var(--status-sage-bg)" : "var(--muted)", color: s.active ? "var(--status-sage-fg)" : "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.active ? "Open" : "Off"}</span>
                                <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                                  <button onClick={() => startEdit(s)} aria-label="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 5 }}><Pencil size={13} /></button>
                                  <button onClick={() => { if (confirm("Remove?")) deleteMut.mutate(s.id); }} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 5 }}><X size={13} /></button>
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
                style={{ width: "100%", padding: "10px", border: "1px dashed var(--border)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          <Plus size={14} /> Add time slot
        </button>

        {showForm && (
            <GlassCard style={{ padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{editingId ? "Edit slot" : "New slot"}</p>
              <FormField label="Day">
                <Select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value as DayOfWeek }))} disabled={!!editingId}>
                  {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                </Select>
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <FormField label="Start"><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></FormField>
                <FormField label="End"><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></FormField>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid var(--border)", marginTop: 14 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>Bookings open</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Clients can book within this window</p>
                </div>
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button variant="gold" loading={createMut.isPending || updateMut.isPending} onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}>
                  {editingId ? "Update" : "Save"}
                </Button>
              </div>
            </GlassCard>
        )}
      </div>
  );
}

function DateOverrideTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<AvailabilityWindow[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [form, setForm] = useState({ date: fmt.dateInput(new Date()), isDayOff: false, startTime: "09:00", endTime: "17:00" });

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
          const { data } = await api.get<AvailabilityWindow[]>("/tech/availability/windows", { params: { date: ds } });
          for (const w of data) { if (!seen.has(w.id)) { seen.add(w.id); all.push(w); } }
        } catch {}
      }
      setOverrides(all.sort((a, b) => a.date.localeCompare(b.date)));
      setLoadingOverrides(false);
    })();
  }, []);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { date: form.date, startTime: form.isDayOff ? "00:00:01" : `${form.startTime}:00`, endTime: form.isDayOff ? "00:00:01" : `${form.endTime}:00`, active: !form.isDayOff };
      if (editingId) return (await api.put(`/tech/availability/${editingId}`, payload)).data;
      return (await api.post("/tech/availability", payload)).data;
    },
    onSuccess: () => {
      toast.success(editingId ? "Updated" : "Override saved");
      resetForm();
      // refresh list
      (async () => {
        setLoadingOverrides(true);
        const today = new Date(); const all: AvailabilityWindow[] = []; const seen = new Set<string>();
        for (let i = 0; i < 60; i++) { const d = new Date(today); d.setDate(d.getDate() + i); const ds = fmt.dateInput(d); try { const { data } = await api.get<AvailabilityWindow[]>("/tech/availability/windows", { params: { date: ds } }); for (const w of data) { if (!seen.has(w.id)) { seen.add(w.id); all.push(w); } } } catch {} }
        setOverrides(all.sort((a, b) => a.date.localeCompare(b.date)));
        setLoadingOverrides(false);
      })();
    },
    onError: () => toast.error("Could not save"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/tech/availability/${id}`),
    onSuccess: (_, id) => { setOverrides((prev) => prev.filter((w) => w.id !== id)); toast.success("Removed"); },
  });

  function resetForm() { setEditingId(null); setShowForm(false); setForm({ date: fmt.dateInput(new Date()), isDayOff: false, startTime: "09:00", endTime: "17:00" }); }
  function startEdit(w: AvailabilityWindow) { setEditingId(w.id); setForm({ date: w.date, isDayOff: !w.active, startTime: w.startTime.slice(0, 5), endTime: w.endTime.slice(0, 5) }); setShowForm(true); }

  return (
      <div style={{ padding: "0 24px" }}>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                style={{ width: "100%", padding: "10px", border: "1px dashed var(--border)", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          <Plus size={14} /> Add date override
        </button>

        {showForm && (
            <GlassCard style={{ padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{editingId ? "Edit override" : "New override"}</p>
              <FormField label="Date">
                <Input type="date" value={form.date} disabled={!!editingId} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </FormField>
              <div onClick={() => setForm((f) => ({ ...f, isDayOff: !f.isDayOff }))}
                   style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 16, borderRadius: 8, border: `1px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, cursor: "pointer", background: form.isDayOff ? "var(--status-rose-bg)" : "transparent", transition: "all .15s" }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, background: form.isDayOff ? "var(--status-rose-fg)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form.isDayOff && <Check size={11} style={{ color: "white" }} />}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: form.isDayOff ? "var(--status-rose-fg)" : "var(--foreground)", margin: 0 }}>Day off</p>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "2px 0 0" }}>Block the entire day from bookings</p>
                </div>
              </div>
              {!form.isDayOff && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <FormField label="Start"><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></FormField>
                    <FormField label="End"><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></FormField>
                  </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button variant="gold" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>{editingId ? "Update" : "Save"}</Button>
              </div>
            </GlassCard>
        )}

        {loadingOverrides ? <Skeleton style={{ height: 160 }} /> : overrides.length === 0 ? (
            <GlassCard style={{ padding: "28px 20px", textAlign: "center" }}>
              <p className="serif" style={{ fontSize: 17, fontStyle: "italic", color: "var(--muted-foreground)", margin: 0 }}>No overrides set</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "6px 0 0" }}>Your weekly schedule applies by default.</p>
            </GlassCard>
        ) : (
            <GlassCard style={{ overflow: "hidden", padding: 0 }}>
              {overrides.map((w, i, arr) => {
                const isDayOff = !w.active;
                return (
                    <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{fmt.date(w.date + "T12:00:00", { weekday: "short", day: "numeric", month: "short" })}</p>
                        {isDayOff ? (
                            <span style={{ fontFamily: "SF Mono, monospace", fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "var(--status-rose-bg)", color: "var(--status-rose-fg)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block", marginTop: 4 }}>Day off</span>
                        ) : (
                            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{w.startTime.slice(0, 5)} – {w.endTime.slice(0, 5)}</p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={() => startEdit(w)} aria-label="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6 }}><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm("Remove?")) deleteMut.mutate(w.id); }} aria-label="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6 }}><X size={14} /></button>
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
// Subscription
// ─────────────────────────────────────────────────────────────────────────────
export function SubscriptionPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const { data: sub, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get("/tech/subscription/status")).data,
    staleTime: 60_000,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const response = await api.get<SubscriptionPlan[]>("/tech/subscription/plans");
      return response.data.sort((a, b) => {
        const order = { FREE: 0, GROW: 1, PRO: 2 };
        return (order[a.id as keyof typeof order] ?? 99) - (order[b.id as keyof typeof order] ?? 99);
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  async function upgrade(tier: string) {
    if (tier === "FREE") return;
    setUpgrading(tier);
    try {
      const response = await api.post<{ paymentUrl?: string }>("/tech/subscription/upgrade", { tier });
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        toast.success("Opening payment…");
        await openURL(paymentUrl).catch(() => toast.error("Could not open payment window"));
        let attempts = 0;
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const { data: subStatus } = await api.get<Subscription>("/tech/subscription/status");
            if (subStatus?.tier === tier && subStatus?.status === "ACTIVE") {
              clearInterval(pollRef.current!); pollRef.current = null;
              toast.success(`Upgraded to ${tier}!`);
              qc.invalidateQueries({ queryKey: ["subscription"] });
              qc.invalidateQueries({ queryKey: ["profile"] });
              setUpgrading(null);
            }
          } catch {}
          if (attempts >= 150) { clearInterval(pollRef.current!); pollRef.current = null; toast.info("Payment processing — check back shortly."); setUpgrading(null); }
        }, 2000);
      }
    } catch (e) {
      toast.error((e as any)?.response?.data?.message ?? "Could not initiate upgrade");
    } finally {
      if (!pollRef.current) setUpgrading(null);
    }
  }

  const currentTier = (sub?.tier ?? "FREE") as string;

  return (
      <div style={{ maxWidth: 700, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Billing" title="Subscription" subtitle="Choose the plan that fits your studio." />
        <div style={{ padding: "0 24px" }}>
          {subLoading ? <Skeleton style={{ height: 100, marginBottom: 20 }} /> : (
              <GlassCard style={{ padding: 18, marginBottom: 24, borderColor: "oklch(from var(--primary) l c h / 0.3)" }} glow>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontFamily: "SF Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", margin: "0 0 6px" }}>Current plan</p>
                    <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "0 0 8px" }}>{sub?.planName ?? currentTier}</h2>
                    <SubBadge tier={currentTier} status={(sub?.status ?? "TRIAL") as string} />
                  </div>
                  <Crown size={28} style={{ color: "var(--primary)", opacity: 0.5, flexShrink: 0, marginTop: 2 }} />
                </div>
                {sub?.status === "TRIAL" && sub?.trialDaysRemaining != null && (
                    <p style={{ fontSize: 13, color: "var(--status-amber-fg)", marginTop: 12, fontWeight: 500 }}>
                      {sub.trialDaysRemaining} day{sub.trialDaysRemaining !== 1 ? "s" : ""} left in trial
                    </p>
                )}
                {sub?.status === "ACTIVE" && sub?.nextBillingDate && (
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 12 }}>
                      Next billing date: <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{fmt.date(sub.nextBillingDate)}</span>
                    </p>
                )}
              </GlassCard>
          )}

          {plansLoading ? [1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 240, marginBottom: 12 }} />) : plans?.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isPopular = plan.id === "PRO" && !isCurrent;
            return (
                <GlassCard
                    key={plan.id}
                    style={{
                      position: "relative",
                      padding: 20,
                      marginBottom: 12,
                      overflow: "visible",
                      border: isCurrent
                          ? "1.5px solid var(--primary)"
                          : isPopular
                              ? "1.5px solid oklch(0.72 0.14 70)"
                              : "1px solid var(--border)",
                      boxShadow: isPopular ? "0 4px 20px oklch(0.72 0.14 70 / 0.18)" : undefined,
                    }}
                >
                  {isPopular && (
                      <span style={{
                        position: "absolute", top: -11, left: 20,
                        background: "linear-gradient(135deg, oklch(0.78 0.14 75), oklch(0.65 0.15 60))",
                        color: "#fff", fontFamily: "SF Mono, monospace", fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        borderRadius: 99, padding: "4px 10px",
                        boxShadow: "0 2px 8px oklch(0.72 0.14 70 / 0.35)",
                      }}>
                  ✦ Most popular
                </span>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, marginTop: isPopular ? 4 : 0 }}>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px" }}>{plan.name}</p>
                      <p className="serif" style={{ fontSize: 26, fontWeight: 400, color: "var(--primary)", margin: 0 }}>
                        R{plan.price}
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)", fontFamily: "inherit", fontWeight: 400 }}>/mo</span>
                      </p>
                    </div>
                    {isCurrent && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "SF Mono, monospace", fontSize: 9, background: "var(--status-sage-bg)", color: "var(--status-sage-fg)", borderRadius: 99, padding: "4px 10px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                    <Check size={11} strokeWidth={2.5} /> Current
                  </span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, background: "var(--muted)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    {[
                      ["Bookings / mo", formatLimit(plan.monthlyBookingLimit)],
                      ["Services", formatLimit(plan.serviceLimit)],
                      ["Photos", formatLimit(plan.portfolioImageLimit)],
                    ].map(([label, val]) => (
                        <div key={label}>
                          <p style={{ fontFamily: "SF Mono, monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted-foreground)", margin: "0 0 3px" }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{val}</p>
                        </div>
                    ))}
                  </div>

                  <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: isCurrent ? 0 : 16 }}>
                    {plan.features.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--foreground)" }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                      background: isPopular ? "oklch(0.72 0.14 70 / 0.15)" : "var(--status-sage-bg)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={10} strokeWidth={3} style={{ color: isPopular ? "oklch(0.55 0.15 60)" : "var(--status-sage-fg)" }} />
                    </span>
                          {f}
                        </li>
                    ))}
                  </ul>

                  {!isCurrent && plan.id !== "FREE" && (
                      <Button
                          variant={isPopular ? "gold" : "outline"}
                          fullWidth
                          loading={upgrading === plan.id}
                          onClick={() => upgrade(plan.id)}
                      >
                        Upgrade to {plan.name}
                      </Button>
                  )}
                </GlassCard>
            );
          })}
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency
// ─────────────────────────────────────────────────────────────────────────────
const REASONS = [
  { value: "EMERGENCY",     label: "Emergency",     emoji: "🚨", desc: "Personal urgent matter" },
  { value: "SICK",          label: "Sick",           emoji: "🤒", desc: "Feeling unwell today" },
  { value: "LOAD_SHEDDING", label: "Load shedding",  emoji: "🔌", desc: "Power outage" },
  { value: "OTHER",         label: "Other",          emoji: "❓", desc: "Something came up" },
] as const;

type Reason = typeof REASONS[number]["value"];

export function EmergencyPage() {
  const nav = useNavigate();
  const [date, setDate]     = useState(fmt.dateInput(new Date()));
  const [reason, setReason] = useState<Reason>("SICK");
  const [message, setMsg]   = useState("");
  const [done, setDone]     = useState<{ clientCount: number } | null>(null);

  const sendMut = useMutation({
    mutationFn: async () => (await api.post("/tech/emergency", { date, reason, message: message.trim() || undefined })).data,
    onSuccess: (data) => { setDone(data); toast.success(`${data.clientCount} clients notified`); },
    onError: () => toast.error("Could not send notification"),
  });

  if (done) {
    return (
        <div style={{ maxWidth: 500, margin: "0 auto", paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
            <BackButton onClick={() => nav(-1)} />
          </div>
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "0 0 10px" }}>Clients notified</h2>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {done.clientCount} client{done.clientCount !== 1 ? "s" : ""} were alerted via WhatsApp.
            </p>
            <div style={{ marginTop: 28 }}>
              <Button variant="gold" onClick={() => nav(-1)}>Done</Button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Alerts" title="Emergency notification" subtitle="Alert all clients booked on a given day via WhatsApp." />
        <div style={{ padding: "0 24px" }}>
          <GlassCard style={{ padding: "13px 16px", marginBottom: 20, borderColor: "var(--status-rose-fg)", background: "var(--status-rose-bg)" }}>
            <p style={{ fontSize: 13, color: "var(--status-rose-fg)", display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.45, margin: 0 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              This sends a WhatsApp message to every client booked on the selected date. Only use in genuine emergencies.
            </p>
          </GlassCard>

          <FormField label="Affected date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>

          <p style={{ fontFamily: "SF Mono, monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", margin: "0 0 10px" }}>Reason</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {REASONS.map((r) => (
                <button key={r.value} type="button" onClick={() => setReason(r.value)}
                        style={{ padding: "14px 12px", border: `1px solid ${reason === r.value ? "var(--primary)" : "var(--border)"}`, borderRadius: 10, background: reason === r.value ? "oklch(from var(--primary) l c h / 0.07)" : "var(--card)", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{r.emoji}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{r.label}</p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>{r.desc}</p>
                </button>
            ))}
          </div>

          <FormField label="Message (optional)">
            <Textarea rows={3} placeholder="Add a note for your clients…" value={message} onChange={(e) => setMsg(e.target.value)} />
          </FormField>

          <Button variant="danger" fullWidth loading={sendMut.isPending} onClick={() => sendMut.mutate()} style={{ borderRadius: 10, height: 48, fontWeight: 600, marginTop: 8 }}>
            <AlertTriangle size={15} /> Send emergency alert
          </Button>
        </div>
      </div>
  );
}

function SubBadge({ tier, status, style }: { tier: string; status: string; style?: React.CSSProperties }) {
  const active = status === "ACTIVE";
  const trial  = status === "TRIAL";
  const bg = active ? "var(--status-sage-bg)" : trial ? "var(--status-amber-bg)" : "var(--muted)";
  const fg = active ? "var(--status-sage-fg)" : trial ? "var(--status-amber-fg)" : "var(--muted-foreground)";
  return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color: fg, borderRadius: 99, padding: "4px 12px", fontFamily: "SF Mono, monospace", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", ...style }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
        {tier}{trial ? " · Trial" : ""}
    </span>
  );
}