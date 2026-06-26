import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, User, Building2, CalendarClock, Crown,
  AlertTriangle, LogOut, Plus, X, Zap, Bell, Sun, Moon, Monitor,
  Pencil, Calendar, RefreshCw, Camera, ImageIcon, Star, EyeOff, Eye, Check
} from "lucide-react";
import { toast } from "sonner";
import { api, type Profile, type Service, type Subscription, type AvailabilityWindow, type PortfolioImage, uploadImage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme, type ThemeMode } from "../lib/theme";
import { useNotifications } from "../stores/notifications";
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
      <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "40px", position: "relative" }}>
        {/* Ambient Top Background Glow */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"320px", pointerEvents:"none", background:"radial-gradient(circle at 50% -20%, var(--primary-muted, rgba(var(--primary-rgb), 0.12)) 0%, transparent 70%)", zIndex: 0 }} />

        {/* Header */}
        <div style={{ position:"relative", padding:"48px 24px 24px", zIndex: 1 }}>
          <div style={{ textAlign:"center", position:"relative" }}>
            <Avatar initials={fmt.initials(p?.fullName ?? user?.fullName)} size={80} style={{ border: "3px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
            {profileQ.isLoading ? (
                <Skeleton style={{ height:26, width:160, margin:"14px auto 0" }} />
            ) : (
                <>
                  <h1 className="serif" style={{ fontSize:32, fontWeight:400, marginTop:16, letterSpacing: "-0.01em" }}>{p?.fullName}</h1>
                  <p style={{ fontSize:14, color:"var(--muted-foreground)", fontWeight:300, marginTop: 4 }}>
                    {p?.businessName}{p?.mobile ? " · Mobile tech" : ""}
                  </p>
                  <SubBadge tier={tier} status={status} style={{ marginTop:12, display:"inline-flex" }} />
                </>
            )}
          </div>
        </div>

        <div style={{ padding:"0 24px", position: "relative", zIndex: 1 }}>
          {/* Menu Sections */}
          <p className="label-mono" style={{ marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Your menu</p>
          <ServicesWidget />

          <p className="label-mono" style={{ marginTop:24, marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Portfolio</p>
          <PortfolioWidget />

          <p className="label-mono" style={{ marginTop:24, marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Reviews</p>
          <ReviewsWidget />

          {/* Notifications section */}
          <p className="label-mono" style={{ marginTop:24, marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Notifications</p>
          <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:16, border: "1px solid var(--border)" }}>
            <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) setTimeout(markAllRead, 800); }}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ position:"relative" }}>
                  <Bell size={20} style={{ color:"var(--muted-foreground)" }} />
                  {unread > 0 && (
                      <span style={{ position:"absolute", top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:"var(--primary)", color:"var(--primary-foreground)", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid var(--card)" }}>
                        {unread > 9 ? "9+" : unread}
                      </span>
                  )}
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight: 500, color:"var(--foreground)" }}>System Alerts</p>
                  <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop: 2 }}>
                    {unread > 0 ? `${unread} unread` : notifications.length === 0 ? "No notifications yet" : `${notifications.length} total`}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} style={{ color:"var(--muted-foreground)", transform: showNotifs ? "rotate(90deg)" : "none", transition:"transform .2s" }} />
            </button>

            {showNotifs && (
                <div style={{ borderTop:"1px solid var(--border)" }}>
                  {notifications.length === 0 ? (
                      <div style={{ padding:"32px 16px", textAlign:"center" }}>
                        <p className="serif" style={{ fontSize:18, fontStyle:"italic", color:"var(--muted-foreground)" }}>No notifications yet</p>
                        <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:6, fontWeight:300 }}>We'll ping you when clients book or pay.</p>
                      </div>
                  ) : (
                      <>
                        <div style={{ maxHeight:300, overflowY:"auto" }}>
                          {notifications.map((n, i) => (
                              <div key={n.id}
                                   onClick={() => markRead(n.id)}
                                   style={{ padding:"14px 16px", borderBottom: i < notifications.length-1 ? "1px solid var(--border)" : "none", cursor:"pointer", opacity: n.read ? 0.6 : 1, transition:"opacity .15s", background: n.read ? "transparent" : "var(--primary-light, rgba(var(--primary-rgb), 0.03))" }}
                              >
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                                  <span className="label-mono" style={{ background:"var(--muted)", color:"var(--muted-foreground)", padding:"2px 8px", borderRadius:99, fontSize: 10, fontWeight: 600 }}>
                                    {n.type === "DEPOSIT_RECEIVED" ? "Deposit" : n.type === "APPOINTMENT_CONFIRMED" ? "Confirmed" : "New booking"}
                                  </span>
                                  <span style={{ fontFamily:"var(--font-mono, monospace)", fontSize:11, color:"var(--muted-foreground)" }}>{fmt.time(n.createdAt)}</span>
                                </div>
                                <p style={{ fontSize:14, color:"var(--foreground)", fontWeight: n.read ? 400 : 500, lineHeight:1.4 }}>{n.message}</p>
                              </div>
                          ))}
                        </div>
                        <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", display:"flex", gap:10, background: "rgba(0,0,0,0.01)" }}>
                          <button onClick={markAllRead} style={{ flex:1, padding:"9px", background:"var(--secondary)", border:"1px solid var(--border)", borderRadius:"8px", cursor:"pointer", fontSize:13, color:"var(--foreground)", fontWeight:500, display: "flex", alignItems:"center", justifyContent:"center" }}>
                            Mark all read
                          </button>
                          <button onClick={() => { clearNotifs(); setShowNotifs(false); }} style={{ flex:1, padding:"9px", background:"var(--status-rose-bg)", border:"1px solid rgba(239, 68, 68, 0.2)", borderRadius:"8px", cursor:"pointer", fontSize:13, color:"var(--status-rose-fg)", fontWeight:500, display: "flex", alignItems:"center", justifyContent:"center" }}>
                            Clear all
                          </button>
                        </div>
                      </>
                  )}
                </div>
            )}
          </GlassCard>

          {/* Appearance section */}
          <p className="label-mono" style={{ marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Appearance</p>
          <GlassCard style={{ padding:"14px 16px", marginBottom:16, border: "1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontSize:15, fontWeight: 500, color:"var(--foreground)" }}>Colour mode</p>
                <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop: 2 }}>
                  {theme === "system" ? "Follows your device settings" : theme === "dark" ? "Dark theme active" : "Light theme active"}
                </p>
              </div>
              <div style={{ display:"flex", alignItems:"center", background:"var(--muted)", borderRadius:99, padding:"4px" }}>
                {THEME_OPTIONS.map(({ mode, Icon, label }) => {
                  const on = theme === mode;
                  return (
                      <button key={mode} onClick={() => setTheme(mode)} aria-label={label} title={label}
                              style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", transition:"all .15s", background: on ? "var(--card)" : "transparent", color: on ? "var(--primary)" : "var(--muted-foreground)", boxShadow: on ? "0 2px 6px rgba(0,0,0,0.08)" : "none" }}>
                        <Icon size={16} strokeWidth={on ? 2.2 : 1.6} />
                      </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* Account links */}
          <p className="label-mono" style={{ marginBottom:8, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Account settings</p>
          <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:16, border: "1px solid var(--border)" }}>
            {MENU.map(({ icon: Icon, label, sub, to }, i) => (
                <div key={to}
                     onClick={() => nav(to)}
                     style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom: i < MENU.length-1 ? "1px solid var(--border)" : "none", cursor:"pointer", transition:"background .15s" }}
                     onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                     onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <Icon size={18} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                    <div>
                      <p style={{ fontSize:15, fontWeight: 500, color:"var(--foreground)" }}>{label}</p>
                      <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop: 2 }}>{sub}</p>
                    </div>
                  </div>
                  <ChevronRight size={15} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                </div>
            ))}
          </GlassCard>

          <GlassCard style={{ overflow:"hidden", padding:0, border: "1px solid var(--border)" }}>
            <button onClick={doLogout}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
              <LogOut size={18} style={{ color:"var(--destructive)", flexShrink:0 }} />
              <span style={{ fontSize:15, color:"var(--destructive)", fontWeight:600 }}>Sign out</span>
            </button>
          </GlassCard>
        </div>
      </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews widget
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
      <GlassCard style={{ overflow: "hidden", padding: 0, border: "1px solid var(--border)", marginBottom: 12 }}>
        {isLoading ? (
            <Skeleton style={{ height: 80, margin: 16 }} />
        ) : !reviews || reviews.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p className="serif" style={{ fontSize: 16, fontStyle: "italic", color: "var(--muted-foreground)" }}>
                No reviews yet
              </p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, fontWeight: 300 }}>
                Clients can leave reviews from your public studio page.
              </p>
            </div>
        ) : (
            reviews.map((r, i) => (
                <div key={r.id} style={{
                  padding: "14px 16px",
                  borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none",
                  opacity: r.hidden ? 0.5 : 1,
                  transition: "opacity .15s",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{r.clientName}</p>
                        <div style={{ display: "flex", gap: 1.5 }}>
                          {[1,2,3,4,5].map((s) => (
                              <Star key={s} size={12}
                                    fill={r.rating >= s ? "var(--status-amber-fg, #d97706)" : "none"}
                                    color={r.rating >= s ? "var(--status-amber-fg, #d97706)" : "var(--border)"} />
                          ))}
                        </div>
                        {r.hidden && (
                            <span className="label-mono" style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: "var(--muted)", color: "var(--muted-foreground)", fontWeight: 600 }}>
                              HIDDEN
                            </span>
                        )}
                      </div>
                      {r.comment && (
                          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, fontWeight: 300 }}>
                            "{r.comment}"
                          </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                          onClick={() => hideMut.mutate(r.id)}
                          aria-label={r.hidden ? "Show" : "Hide"}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6, transition: "color 0.2s" }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                        {r.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button
                          onClick={() => { if (confirm("Remove this review?")) deleteMut.mutate(r.id); }}
                          aria-label="Delete"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6, transition: "color 0.2s" }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                </div>
            ))
        )}
      </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio widget
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioWidget() {
  const qc       = useQueryClient();
  const fileRef  = useRef<HTMLInputElement>(null);
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
      setShowForm(false);
      setCaption("");
      setPreviewUrl("");
      toast.success("Photo added to portfolio");
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
      toast.success("Photo uploaded successfully");
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
      <>
        <GlassCard style={{ overflow: "hidden", padding: 0, border: "1px solid var(--border)", marginBottom: 12 }}>
          {isLoading ? (
              <Skeleton style={{ height: 80, margin: 16 }} />
          ) : (images ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p className="serif" style={{ fontSize: 16, fontStyle: "italic", color: "var(--muted-foreground)" }}>
                  No portfolio photos yet
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, fontWeight: 300 }}>
                  Add your recent sets to showcase before clients book.
                </p>
              </div>
          ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: 8 }}>
                {(images ?? []).map((img) => (
                    <div key={img.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", borderRadius: 8, border: "1px solid var(--border-muted)" }}>
                      <img
                          src={img.imageUrl}
                          alt={img.caption || "Portfolio item"}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <button
                          onClick={() => { if (confirm("Remove this photo?")) deleteMut.mutate(img.id); }}
                          aria-label="Remove photo"
                          style={{
                            position: "absolute", top: 6, right: 6,
                            background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "white", transition: "background 0.2s"
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(220, 38, 38, 0.8)")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.6)")}>
                        <X size={14} />
                      </button>
                      {img.caption && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                            padding: "12px 8px 6px", fontSize: 11, color: "white", fontWeight: 500,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                          }}>
                            {img.caption}
                          </div>
                      )}
                    </div>
                ))}
              </div>
          )}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePickImage} />
            <button
                onClick={() => { setShowForm(true); fileRef.current?.click(); }}
                style={{ width: "100%", padding: "10px", border: "1px dashed var(--border)", borderRadius: "8px", background: "transparent", cursor: uploading ? "wait" : "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
              <Camera size={15} /> {uploading ? "Uploading Image..." : "Add Gallery Image"}
            </button>
          </div>
        </GlassCard>

        {showForm && previewUrl && (
            <GlassCard style={{ padding: 16, marginTop: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
                <img src={previewUrl} alt="Upload preview" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid var(--border)" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description / Caption</p>
                  <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="e.g. Bio-sculpture gel overlay with nail art"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 13, background: "var(--background)", color: "var(--foreground)", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => { setShowForm(false); setPreviewUrl(""); setCaption(""); }}>
                  Cancel
                </Button>
                <Button variant="gold" loading={uploadMut.isPending} onClick={() => uploadMut.mutate(previewUrl)}>
                  Save Photo
                </Button>
              </div>
            </GlassCard>
        )}
      </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Services widget
// ─────────────────────────────────────────────────────────────────────────────
function ServicesWidget() {
  const qc = useQueryClient();
  const fileRef                   = useRef<HTMLInputElement>(null);
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
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
      <>
        <GlassCard style={{ overflow: "hidden", padding: 0, border: "1px solid var(--border)", marginBottom: 12 }}>
          {isLoading
              ? <Skeleton style={{ height: 80, margin: 16 }} />
              : (services ?? []).map((s, i, arr) => (
                  <div key={s.id}
                       style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "8px", flexShrink: 0, background: "var(--muted)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-muted)" }}>
                      {s.imageUrl
                          ? <img src={s.imageUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <ImageIcon size={20} color="var(--muted-foreground)" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--foreground)" }}>{s.name}</p>
                      <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{s.durationMinutes} min</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                      <span className="serif" style={{ fontSize: 18, fontWeight: 400 }}>{fmt.currency(Number(s.price))}</span>
                      <button
                          onClick={() => { if (confirm(`Remove "${s.name}"?`)) deleteMut.mutate(s.id); }}
                          aria-label={`Remove ${s.name}`}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", padding: 6, transition: "color 0.2s" }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
              ))
          }
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <button
                onClick={() => setAdding(!adding)}
                style={{ width: "100%", padding: "10px", border: "1px dashed var(--border)", borderRadius: "8px", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
              <Plus size={15} /> Add treatment item
            </button>
          </div>
        </GlassCard>

        {adding && (
            <GlassCard style={{ padding: 20, marginTop: 8, border: "1px solid var(--border)" }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", marginBottom: 8 }}>Cover image (optional)</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "8px", background: "var(--muted)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--border)" }}>
                    {form.imageUrl
                        ? <img src={form.imageUrl} alt="attached treatment design" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Camera size={22} color="var(--muted-foreground)" />
                    }
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePickImage} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--card)", cursor: uploading ? "wait" : "pointer", fontSize: 12, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                      <Camera size={14} />
                      {uploading ? "Uploading…" : form.imageUrl ? "Change photo" : "Upload photo"}
                    </button>
                    {form.imageUrl && (
                        <button onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))} style={{ padding: "4px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, color: "var(--destructive)", textAlign: "left", fontWeight: 500 }}>
                          Remove photo
                        </button>
                    )}
                  </div>
                </div>
              </div>

              <FormField label="Service name">
                <Input placeholder="e.g. Luxury Gel Pedicure" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                <FormField label="Duration (minutes)">
                  <Input type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
                </FormField>
                <FormField label="Price (R)">
                  <Input type="number" value={form.price || ""} placeholder="0" onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
                </FormField>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                <Button variant="ghost" onClick={() => { setAdding(false); setForm(emptyForm); }}>Cancel</Button>
                <Button variant="gold" loading={createMut.isPending || uploading} onClick={() => createMut.mutate()}>
                  Add service
                </Button>
              </div>
            </GlassCard>
        )}
      </>
  );
}

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
      <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Management" title="Edit profile" />
        <div style={{ padding:"0 24px" }}>
          <GlassCard style={{ padding:20, marginBottom:20, border: "1px solid var(--border)" }}>
            <FormField label="Full name">
              <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
            </FormField>
            <FormField label="Business name">
              <Input value={form.businessName ?? ""} onChange={(e) => set("businessName", e.target.value)} />
            </FormField>
            <FormField label="Salon address">
              <Input value={form.salonAddress ?? ""} onChange={(e) => set("salonAddress", e.target.value)} />
            </FormField>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0 6px", borderTop: "1px solid var(--border)", marginTop: 16 }}>
              <div>
                <p style={{ fontSize:15, fontWeight:500, color:"var(--foreground)" }}>Mobile technician</p>
                <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop: 2 }}>I travel to clients' homes</p>
              </div>
              <Toggle
                  checked={!!form.mobile}
                  onChange={(v) => set("mobile", v)}
              />
            </div>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
            Save profile alterations
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

  const profileQ = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get<Profile>("/tech/profile")).data,
    staleTime: 60_000,
  });

  useEffect(() => {
    const data = profileQ.data;
    if (!data || loaded) return;
    setForm({
      bankName: data.bankName ?? "",
      accountHolder: data.accountHolder ?? "",
      accountNumber: data.accountNumber ?? "",
      branchCode: data.branchCode ?? "",
      accountType: data.accountType ?? "Cheque",
    });
    setLoaded(true);
  }, [profileQ.data, loaded]);

  const updateMut = useMutation({
    mutationFn: async () => (await api.put("/tech/profile", form)).data,
    onSuccess: (data) => {
      qc.setQueryData<Profile>(["profile"], (old) => ({
        ...(old ?? data),
        ...data,
        ...form,
        hasBankingDetails: true,
      }));
      qc.invalidateQueries({ queryKey:["profile"] });
      toast.success("Banking details saved");
      nav(-1);
    },
    onError: () => toast.error("Could not save"),
  });

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]:v })); }

  return (
      <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Finance" title="Payout Configuration" subtitle="Your direct deposit routing profile. Kept fully encrypted." />
        <div style={{ padding:"0 24px" }}>
          <GlassCard style={{ padding:20, marginBottom:20, border: "1px solid var(--border)" }}>
            <FormField label="Bank name">
              <Input placeholder="FNB, Standard Bank, Capitec…" value={form.bankName} onChange={(e) => set("bankName",e.target.value)} />
            </FormField>
            <FormField label="Account holder">
              <Input placeholder="Full legal name as seen on statement" value={form.accountHolder} onChange={(e) => set("accountHolder",e.target.value)} />
            </FormField>
            <FormField label="Account number">
              <Input placeholder="Routing numeric digits" value={form.accountNumber} onChange={(e) => set("accountNumber",e.target.value)} />
            </FormField>
            <FormField label="Branch code">
              <Input placeholder="Universal or explicit branch code" value={form.branchCode} onChange={(e) => set("branchCode",e.target.value)} />
            </FormField>
            <FormField label="Account type">
              <Select value={form.accountType} onChange={(e) => set("accountType",e.target.value)}>
                {["Cheque","Savings","Transmission"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
          </GlassCard>
          <Button variant="gold" size="lg" fullWidth loading={updateMut.isPending} onClick={() => updateMut.mutate()}>
            Save configuration profile
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
      <div style={{ maxWidth: "700px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Calendar" title="Studio Availability" subtitle="Control structural client appointment windows." />

        <div style={{ padding:"0 24px 20px" }}>
          <div style={{ display:"flex", background:"var(--muted)", borderRadius:12, padding:4, gap:4 }}>
            {([["weekly","Weekly Template",RefreshCw],["dates","Specific Exception Dates",Calendar]] as const).map(([key,label,Icon]) => (
                <button key={key} onClick={() => setTab(key)}
                        style={{
                          flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                          padding:"10px 14px", border:"none", cursor:"pointer", borderRadius:10,
                          fontSize:13, fontWeight:600, transition:"all .15s",
                          background: tab===key ? "var(--card)" : "transparent",
                          color: tab===key ? "var(--foreground)" : "var(--muted-foreground)",
                          boxShadow: tab===key ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                        }}>
                  <Icon size={14} strokeWidth={tab===key ? 2.2 : 1.6} />
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
      <div style={{ padding:"0 24px" }}>
        <p style={{ fontSize:14, color:"var(--muted-foreground)", fontWeight:300, marginBottom:16 }}>
          Configure standard opening templates that repeat infinitely each week.
        </p>

        {schedulesQ.isLoading ? (
            <Skeleton style={{ height:280, marginBottom:16 }} />
        ) : (
            <GlassCard style={{ overflow:"hidden", padding:0, marginBottom:16, border: "1px solid var(--border)" }}>
              {DAYS.map((day, i) => {
                const slots = schedulesByDay[day];
                return (
                    <div key={day} style={{ borderBottom: i < DAYS.length-1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:14 }}>
                        <span className="label-mono" style={{ width:40, fontSize:11, fontWeight:600, color:"var(--primary)", flexShrink:0, textTransform:"uppercase", letterSpacing:.5 }}>
                          {DAY_SHORT[day]}
                        </span>

                        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                          {slots.length === 0 ? (
                              <span style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, fontStyle: "italic" }}>Closed</span>
                          ) : slots.map((s) => (
                              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <span style={{
                                  fontSize:13, fontFamily:"var(--font-mono, monospace)", fontWeight:500,
                                  color: s.active ? "var(--foreground)" : "var(--muted-foreground)",
                                }}>
                                  {s.startTime.slice(0,5)} – {s.endTime.slice(0,5)}
                                </span>
                                <span className="label-mono" style={{
                                  fontSize:9, padding:"2px 8px", borderRadius:99, fontWeight:600,
                                  background: s.active ? "var(--status-sage-bg)" : "var(--muted)",
                                  color: s.active ? "var(--status-sage-fg)" : "var(--muted-foreground)",
                                }}>
                                  {s.active ? "OPEN" : "OFF"}
                                </span>
                                <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
                                  <button onClick={() => startEdit(s)} aria-label="Edit slot time"
                                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => { if (confirm("Remove this schedule?")) deleteMut.mutate(s.id); }} aria-label="Delete template entry"
                                          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                                    <X size={14} />
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
                style={{ width:"100%", padding:"10px", border:"1px dashed var(--border)", borderRadius:"8px", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--primary)", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:16, transition:"background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
          <Plus size={15} /> Add time window template
        </button>

        {showForm && (
            <GlassCard style={{ padding:20, marginBottom:20, border: "1px solid var(--border)" }}>
              <p style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>{editingId ? "Modify template entry" : "Create standard window"}</p>

              <FormField label="Day">
                <Select value={form.dayOfWeek}
                        onChange={(e) => setForm((f) => ({ ...f, dayOfWeek:e.target.value as DayOfWeek }))}
                        disabled={!!editingId}>
                  {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0)+d.slice(1).toLowerCase()}</option>)}
                </Select>
              </FormField>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop: 4 }}>
                <FormField label="Start time">
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime:e.target.value }))} />
                </FormField>
                <FormField label="End time">
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime:e.target.value }))} />
                </FormField>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", borderTop: "1px solid var(--border)", marginTop: 14 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500, color:"var(--foreground)" }}>Online booking active</p>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop:2 }}>Clients can reserve spaces within this bracket</p>
                </div>
                <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active:v }))} />
              </div>

              <div style={{ display:"flex", gap:10, justifyContent: "flex-end", marginTop: 8 }}>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button variant="gold"
                        loading={createMut.isPending || updateMut.isPending}
                        onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}>
                  {editingId ? "Update slot" : "Save window"}
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
  const [form, setForm] = useState({
    date: fmt.dateInput(new Date()),
    isDayOff: false,
    startTime: "09:00",
    endTime: "17:00",
  });

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
      <div style={{ padding:"0 24px" }}>
        <p style={{ fontSize:14, color:"var(--muted-foreground)", fontWeight:300, marginBottom:16 }}>
          Inject temporary modifiers on specific dates for holiday periods, extended blocks, or emergency store closures.
        </p>

        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
                style={{ width:"100%", padding:"10px", border:"1px dashed var(--border)", borderRadius:"8px", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--primary)", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:16, transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
          <Plus size={15} /> Add calendar override date
        </button>

        {showForm && (
            <GlassCard style={{ padding:20, marginBottom:16, border: "1px solid var(--border)" }}>
              <p style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>{editingId ? "Edit calendar modifier" : "Create specific override"}</p>

              <FormField label="Target date">
                <Input type="date" value={form.date} disabled={!!editingId}
                       onChange={(e) => setForm((f) => ({ ...f, date:e.target.value }))} />
              </FormField>

              <div onClick={() => setForm((f) => ({ ...f, isDayOff:!f.isDayOff }))}
                   style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", marginBottom:16, borderRadius:"8px", border:`1px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, cursor:"pointer", background: form.isDayOff ? "var(--status-rose-bg)" : "transparent", transition:"all .15s" }}>
                <div style={{ width:18, height:18, borderRadius:4, border:`1px solid ${form.isDayOff ? "var(--status-rose-fg)" : "var(--border)"}`, background: form.isDayOff ? "var(--status-rose-fg)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {form.isDayOff && <Check size={12} style={{ color:"white" }} />}
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:500, color: form.isDayOff ? "var(--status-rose-fg)" : "var(--foreground)" }}>Store complete closure day</p>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300, marginTop: 2 }}>Locks the day out completely for all bookings</p>
                </div>
              </div>

              {!form.isDayOff && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop: 4 }}>
                    <FormField label="Start window">
                      <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime:e.target.value }))} />
                    </FormField>
                    <FormField label="End window">
                      <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime:e.target.value }))} />
                    </FormField>
                  </div>
              )}

              <div style={{ display:"flex", gap:10, justifyContent: "flex-end", marginTop: 16 }}>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button variant="gold" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
                  {editingId ? "Update template" : "Save override"}
                </Button>
              </div>
            </GlassCard>
        )}

        {loadingOverrides ? (
            <Skeleton style={{ height:160 }} />
        ) : overrides.length === 0 ? (
            <GlassCard style={{ padding:"32px 16px", textAlign:"center", border: "1px solid var(--border)" }}>
              <p className="serif" style={{ fontSize:18, fontStyle:"italic", color:"var(--muted-foreground)" }}>No active modifiers</p>
              <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop:6, fontWeight:300 }}>Standard repeatable weekly scheduling configuration applies safely.</p>
            </GlassCard>
        ) : (
            <GlassCard style={{ overflow:"hidden", padding:0, border: "1px solid var(--border)" }}>
              {overrides.map((w, i, arr) => {
                const isDayOff = !w.active;
                return (
                    <div key={w.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <p style={{ fontSize:15, fontWeight:500, color: "var(--foreground)" }}>
                          {fmt.date(w.date + "T12:00:00", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
                        </p>
                        {isDayOff ? (
                            <span className="label-mono" style={{ fontSize:9, padding:"2px 8px", borderRadius:99, background:"var(--status-rose-bg)", color:"var(--status-rose-fg)", fontWeight:600, display: "inline-block", marginTop: 4 }}>
                              DAY OFF
                            </span>
                        ) : (
                            <p style={{ fontSize:13, color:"var(--muted-foreground)", marginTop: 4 }}>
                              {w.startTime.slice(0,5)} – {w.endTime.slice(0,5)}
                              <span className="label-mono" style={{ marginLeft:8, fontSize:9, padding:"1px 6px", borderRadius:99, background:"var(--status-sage-bg)", color:"var(--status-sage-fg)", fontWeight:600 }}>MODIFIED OPEN</span>
                            </p>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={() => startEdit(w)} aria-label="Edit adjustment date window"
                                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => { if (confirm("Remove this override?")) deleteMut.mutate(w.id); }} aria-label="Drop exception override window"
                                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:6 }}>
                          <X size={15} />
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
// Subscription
// ─────────────────────────────────────────────────────────────────────────────
export function SubscriptionPage() {
  const nav = useNavigate();
  const qc  = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        const order = { FREE: 0, GROW: 1, PRO: 2 };
        return (order[a.id as keyof typeof order] ?? 99) - (order[b.id as keyof typeof order] ?? 99);
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — plans rarely change but should not cache forever
  });

  async function upgrade(tier: string) {
    if (tier === "FREE") return;

    setUpgrading(tier);
    try {
      const response = await api.post<{ paymentUrl?: string; message?: string }>("/tech/subscription/upgrade", { tier });
      const paymentUrl = response.data?.paymentUrl;

      if (paymentUrl) {
        toast.success("Opening Paystack payment Gateway...");
        await openURL(paymentUrl).catch((e) => {
          console.error("[Settings] Failed to open payment URL:", e);
          toast.error("Could not open payment window.");
        });

        const maxAttempts = 150;
        let attempts = 0;

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const { data: subStatus } = await api.get<Subscription>("/tech/subscription/status");
            if (subStatus?.tier === tier && subStatus?.status === "ACTIVE") {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              toast.success(`✅ Tier upgraded to ${tier} successfully!`);
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
            toast.info("Processing webhook validation updates shortly.");
            setUpgrading(null);
          }
        }, 2000);

        return;
      } else {
        toast.success("Upgrade sequence active — dispatching manual parameters.");
      }
    } catch (e) {
      const errMsg = (e as any)?.response?.data?.message ?? "Could not initiate upgrade";
      toast.error(errMsg);
    } finally {
      if (!pollRef.current) setUpgrading(null);
    }
  }

  const currentTier = (sub?.tier ?? "FREE") as string;

  return (
      <div style={{ maxWidth: "700px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Billing" title="NailDesk Licensing" subtitle="Select studio tiers tailored to operational capacity dimensions." />
        <div style={{ padding:"0 24px" }}>
          {subLoading ? <Skeleton style={{ height:110, marginBottom:16 }} /> : (
              <GlassCard style={{ padding:20, marginBottom:24, border: "1px solid var(--primary)" }} glow>
                <p className="label-mono" style={{ color:"var(--primary)", marginBottom:4, fontSize: 11, textTransform: "uppercase" }}>Current operational plan</p>
                <h2 className="serif" style={{ fontSize:32, fontWeight:400 }}>{(sub as any)?.planName ?? currentTier}</h2>
                <SubBadge tier={currentTier} status={(sub?.status ?? "TRIAL") as string} style={{ marginTop:8 }} />
                {(sub?.status === "TRIAL") && sub?.trialDaysRemaining != null && (
                    <p style={{ fontSize:13, color:"var(--status-amber-fg, #d97706)", marginTop:12, fontWeight:500 }}>
                      ⏳ {sub.trialDaysRemaining} day{sub.trialDaysRemaining !== 1 ? "s" : ""} remaining in trial window
                    </p>
                )}
              </GlassCard>
          )}

          <p className="label-mono" style={{ marginBottom:12, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Available upgrades</p>
          {plansLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} style={{ height:260, marginBottom:12 }} />)
          ) : !plans || plans.length === 0 ? (
              <GlassCard style={{ padding:20, textAlign:"center" }}>
                <p style={{ color:"var(--muted-foreground)" }}>Could not load plan registry metrics.</p>
              </GlassCard>
          ) : (
              plans.map((plan) => {
                const isCurrent = currentTier === plan.id;
                return (
                    <GlassCard key={plan.id}
                               style={{ padding:20, marginBottom:12, border: isCurrent ? "1.5px solid var(--primary)" : "1px solid var(--border)", background: isCurrent ? "var(--primary-light, rgba(var(--primary-rgb), 0.02))" : "var(--card-bg)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div>
                          <p style={{ fontSize:18, fontWeight:600, color: "var(--foreground)" }}>{plan.name}</p>
                          <p className="serif" style={{ fontSize:22, fontWeight:400, color:"var(--primary)", marginTop:4 }}>
                            R {plan.price}/mo
                          </p>
                        </div>
                        {isCurrent && (
                            <span className="label-mono" style={{ background:"var(--status-sage-bg)", color:"var(--status-sage-fg)", borderRadius:99, padding:"4px 12px", fontSize: 10, fontWeight: 600 }}>Active Tier</span>
                        )}
                      </div>

                      <div style={{ background:"var(--secondary)", borderRadius:"8px", padding:14, marginBottom:14, fontSize:13, color:"var(--muted-foreground)", border: "1px solid var(--border-muted)" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Bookings / month</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.monthlyBookingLimit}</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Services</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.serviceLimit}</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Portfolio Limit</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)" }}>{plan.portfolioImageLimit} images</p>
                          </div>
                          <div>
                            <p className="label-mono" style={{ fontSize:10, marginBottom:2 }}>Advanced Modules</p>
                            <p style={{ fontWeight:500, color:"var(--foreground)", fontSize: 11 }}>
                              {[
                                plan.depositCollection && "Deposits",
                                plan.waitlist && "Waitlist",
                                plan.analytics && "Analytics",
                                plan.whatsAppBot && "WhatsApp Automations",
                              ].filter(Boolean).join(" • ") || "Core Essentials"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <ul style={{ paddingLeft:0, listStyle:"none", display:"flex", flexDirection:"column", gap:6, marginBottom:isCurrent ? 0 : 16 }}>
                        {plan.features.map((f: string) => (
                            <li key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>
                              <Zap size={13} style={{ color:"var(--primary)", flexShrink:0 }} /> {f}
                            </li>
                        ))}
                      </ul>
                      {!isCurrent && plan.id !== "FREE" && (
                          <Button variant="gold" fullWidth loading={upgrading === plan.id}
                                  onClick={() => upgrade(plan.id)}>
                            Migrate to {plan.name}
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
  { value:"LOAD_SHEDDING",label:"Load shedding",emoji:"🔌", desc:"Power grid outage details" },
  { value:"OTHER",        label:"Other",        emoji:"❓", desc:"Unforeseen conflict event" },
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
        <div style={{ maxWidth: "500px", margin: "0 auto", paddingBottom: "40px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
            <BackButton onClick={() => nav(-1)} />
          </div>
          <div style={{ padding:"40px 24px", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <h2 className="serif" style={{ fontSize:32, fontWeight:400 }}>Broadcast dispatched</h2>
            <p style={{ fontSize:15, color:"var(--muted-foreground)", fontWeight:300, marginTop:10, lineHeight: 1.5 }}>
              {done.clientCount} active client profiles on target template framework successfully warned via automated WhatsApp broadcast arrays.
            </p>
            <div style={{ marginTop:28 }}>
              <Button variant="gold" onClick={() => nav(-1)}>Return to workspace</Button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"52px 24px 0" }}>
          <BackButton onClick={() => nav(-1)} />
          <span style={{ fontSize:14, color:"var(--muted-foreground)" }}>Back</span>
        </div>
        <PageHeader eyebrow="Alert system" title="Emergency broadcast matrix" subtitle="Instant message routing for client schedule updates." />
        <div style={{ padding:"0 24px" }}>
          <GlassCard style={{ padding:"14px 16px", marginBottom:20, border: "1px solid var(--status-rose-fg)", background:"var(--status-rose-bg)" }}>
            <p style={{ fontSize:13, color:"var(--status-rose-fg)", display:"flex", alignItems:"flex-start", gap:8, fontWeight:400, lineHeight: 1.4 }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }} />
              Executing this routine dispatches automated high-priority logs directly via real-time hooks to all scheduled clients on chosen parameters.
            </p>
          </GlassCard>

          <FormField label="Affected schedule date gap">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>

          <p className="label-mono" style={{ marginBottom:10, fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--muted-foreground)" }}>Incident vector classification</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
            {REASONS.map((r) => (
                <button key={r.value} type="button" onClick={() => setReason(r.value)}
                        style={{ padding:"14px 12px", border:`1px solid ${reason===r.value?"var(--primary)":"var(--border)"}`, borderRadius:"8px", background: reason===r.value?"var(--status-amber-bg)":"var(--card)", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
                  <span style={{ fontSize:26, display:"block", marginBottom:6 }}>{r.emoji}</span>
                  <p style={{ fontSize:14, fontWeight:600, color: "var(--foreground)" }}>{r.label}</p>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", marginTop: 2, fontWeight: 300 }}>{r.desc}</p>
                </button>
            ))}
          </div>

          <FormField label="Appended context note (optional)">
            <Textarea rows={4} placeholder="Provide structural specifics to reduce structural retention attrition drop rates…" value={message} onChange={(e) => setMsg(e.target.value)} />
          </FormField>

          <Button
              variant="danger"
              fullWidth
              loading={sendMut.isPending}
              onClick={() => sendMut.mutate()}
              style={{ borderRadius:"8px", height:50, fontWeight: 600, marginTop: 8 }}
          >
            <AlertTriangle size={16} /> Fire emergency system logs
          </Button>
        </div>
      </div>
  );
}

function SubBadge({ tier, status, style }: { tier:string; status:string; style?: React.CSSProperties }) {
  const active  = status === "ACTIVE";
  const trial   = status === "TRIAL";
  const bg = active ? "var(--status-sage-bg)" : trial ? "var(--status-amber-bg)" : "var(--muted)";
  const fg = active ? "var(--status-sage-fg)" : trial ? "var(--status-amber-fg)" : "var(--muted-foreground)";
  return (
      <span className="label-mono"
            style={{ display:"inline-flex", alignItems:"center", gap:6, background:bg, color:fg, borderRadius:99, padding:"4px 12px", fontSize: 11, fontWeight: 600, ...style }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:"currentColor" }} />
        {tier}{trial ? " · Trial window" : ""}
      </span>
  );
}