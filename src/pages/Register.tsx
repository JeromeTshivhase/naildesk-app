import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Lock, User, Building2, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { GlassCard, Button, Toggle } from "../components/ui";

type Step = "form" | "terms";

interface LegalDoc {
  title: string;
  versionId: string;
  content: string;
  publishedAt: string;
}

export default function RegisterPage() {
  const nav          = useNavigate();
  const loginSuccess = useAuth((s) => s.loginSuccess);

  const [step, setStep]           = useState<Step>("form");
  const [loading, setLoading]     = useState(false);
  const [form, setForm]           = useState({ phone:"", password:"", fullName:"", businessName:"", isMobile:false });

  // T&C state
  const [legalDoc, setLegalDoc]         = useState<LegalDoc | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted]         = useState(false);
  const [accepting, setAccepting]       = useState(false);
  const scrollRef                       = useRef<HTMLDivElement>(null);

  // Auth data from /auth/register — account already exists at this point,
  // tokens are already valid. We just hold off calling loginSuccess()
  // until T&C is accepted, so the user can't skip past it.
  const [pendingAuth, setPendingAuth]   = useState<Record<string, any> | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone || !form.password || !form.fullName) {
      toast.error("Fill in required fields"); return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters"); return;
    }
    setLoading(true);
    try {
      // Registration is a single step on the backend: the account is created
      // immediately and tokens come back in this response. There is no OTP —
      // whatsappVerified flips to true passively once the tech first messages
      // the WhatsApp bot number.
      const { data } = await api.post("/auth/register", {
        ...form, phone: form.phone.replace(/\s/g, ""),
      });
      setPendingAuth(data);
      await fetchTerms();
      setStep("terms");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Registration failed");
    } finally { setLoading(false); }
  }

  async function fetchTerms() {
    setLegalLoading(true);
    try {
      const { data } = await api.get<LegalDoc>("/legal/terms");
      setLegalDoc(data);
    } catch {
      // If fetching fails, show a fallback so registration can still complete
      setLegalDoc({
        title: "Terms & Conditions",
        versionId: "v1",
        content: "By using NailDesk you agree to our terms of service. Please contact support@naildesk.app for the full document.",
        publishedAt: new Date().toISOString(),
      });
    } finally { setLegalLoading(false); }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToBottom(true);
  }

  async function acceptTerms() {
    if (!legalDoc || !pendingAuth) return;
    setAccepting(true);
    try {
      // Record acceptance (best-effort — auth cookies are already set)
      await api.post("/legal/accept", { versionId: legalDoc.versionId }).catch(() => {});
      // Now log the user in with tokens
      loginSuccess({
        id: pendingAuth.techId ?? pendingAuth.user?.id,
        fullName: pendingAuth.fullName ?? pendingAuth.user?.fullName,
        businessName: pendingAuth.user?.businessName,
        isMobile: pendingAuth.user?.mobile ?? pendingAuth.user?.isMobile,
        phone: form.phone,
      }, {
        accessToken: pendingAuth.accessToken,
        refreshToken: pendingAuth.refreshToken,
      });
      nav("/", { replace: true });
    } catch {
      toast.error("Could not record acceptance. Please try again.");
    } finally { setAccepting(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <div style={{
        minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"40px 24px",
        background:"radial-gradient(ellipse 80% 55% at 50% 0%, oklch(0.94 0.045 25) 0%, transparent 62%), var(--background)",
        position:"relative",
      }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <img
                src="/brand/naildesk-wordmark-transparent.png"
                alt="NailDesk"
                style={{ height:44, objectFit:"contain", margin:"0 auto", display:"block" }}
                onError={(e) => { e.currentTarget.style.display="none"; }}
            />
          </div>

          {/* ── Step indicator ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:20 }}>
            {(["form","terms"] as Step[]).map((s, i) => {
              const done    = ["form","terms"].indexOf(step) > i;
              const current = step === s;
              return (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{
                      width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, transition:"all .2s",
                      background: done || current ? "var(--primary)" : "var(--muted)",
                      color: done || current ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}>
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    {i < 1 && <div style={{ width:24, height:1, background: done ? "var(--primary)" : "var(--border)" }} />}
                  </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"0 4px", marginBottom:20 }}>
            {["Details","Terms"].map((l, i) => (
                <span key={l} className="label-mono" style={{ color: ["form","terms"].indexOf(step) === i ? "var(--primary)" : "var(--muted-foreground)", fontSize:9 }}>{l}</span>
            ))}
          </div>

          {/* ── Step 1: Form ── */}
          {step === "form" && (
              <GlassCard style={{ padding:28 }}>
                <h1 className="serif" style={{ fontSize:28, fontWeight:400, marginBottom:4 }}>Create account</h1>
                <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:24 }}>
                  Set up your studio in minutes.
                </p>

                <form onSubmit={submitForm} noValidate style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <FieldWrap icon={<User size={14} />}     label="Full name *"     placeholder="Zandi Mahlangu"      type="text"     value={form.fullName}     onChange={(v) => set("fullName", v)} />
                  <FieldWrap icon={<Building2 size={14} />} label="Business name"  placeholder="Nails by Zandi"      type="text"     value={form.businessName} onChange={(v) => set("businessName", v)} />
                  <FieldWrap icon={<Phone size={14} />}    label="Phone number *"  placeholder="+27 82 123 4567"     type="tel"      value={form.phone}        onChange={(v) => set("phone", v)} />
                  <FieldWrap icon={<Lock size={14} />}     label="Password *"      placeholder="Min. 8 characters"   type="password" value={form.password}     onChange={(v) => set("password", v)} />

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--muted)", borderRadius:"var(--radius)", padding:"12px 14px" }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:500 }}>Mobile technician</p>
                      <p style={{ fontSize:12, color:"var(--muted-foreground)" }}>I travel to clients</p>
                    </div>
                    <Toggle checked={form.isMobile} onChange={(v) => set("isMobile", v)} />
                  </div>

                  <Button type="submit" variant="gold" size="lg" fullWidth loading={loading} style={{ marginTop:4 }}>
                    Create account
                  </Button>
                </form>

                <p style={{ textAlign:"center", fontSize:13, color:"var(--muted-foreground)", marginTop:20 }}>
                  Already registered?{" "}
                  <Link to="/login" style={{ color:"var(--primary)", fontWeight:500, textDecoration:"none" }}>Sign in →</Link>
                </p>
              </GlassCard>
          )}

          {/* ── Step 2: Terms & Conditions ── */}
          {step === "terms" && (
              <GlassCard style={{ padding:0, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--status-amber-bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <FileText size={16} style={{ color:"var(--status-amber-fg)" }} />
                    </div>
                    <div>
                      <p className="label-mono" style={{ color:"var(--primary)" }}>Step 2 of 2</p>
                      <h1 className="serif" style={{ fontSize:22, fontWeight:400, lineHeight:1 }}>
                        {legalDoc?.title ?? "Terms & Conditions"}
                      </h1>
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300 }}>
                    Please read and accept to complete your registration.
                  </p>
                </div>

                {/* Content */}
                {legalLoading ? (
                    <div style={{ padding:40, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                      <Loader2 size={24} style={{ color:"var(--primary)", animation:"spinAnim .7s linear infinite" }} />
                      <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>Loading terms…</p>
                      <style>{`@keyframes spinAnim { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <>
                      <div
                          ref={scrollRef}
                          onScroll={handleScroll}
                          style={{
                            height:280, overflowY:"auto", padding:"16px 24px",
                            fontSize:13, lineHeight:1.7, color:"var(--foreground)",
                            fontWeight:300, whiteSpace:"pre-wrap",
                            background:"var(--secondary)",
                            borderBottom:"1px solid var(--border)",
                          }}
                      >
                        {legalDoc?.content}
                      </div>

                      {/* Scroll hint */}
                      {!scrolledToBottom && (
                          <div style={{ padding:"8px 24px", background:"var(--card)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:11, color:"var(--muted-foreground)", fontStyle:"italic" }}>
                      Scroll to the bottom to continue ↓
                    </span>
                          </div>
                      )}

                      {/* Accept section */}
                      <div style={{ padding:"16px 24px 24px" }}>
                        {/* Checkbox */}
                        <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer", marginBottom:16 }}>
                          <div
                              onClick={() => { if (scrolledToBottom) setAccepted(!accepted); }}
                              style={{
                                width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                                border:`2px solid ${accepted ? "var(--primary)" : scrolledToBottom ? "var(--border)" : "var(--muted-foreground)"}`,
                                background: accepted ? "var(--primary)" : "transparent",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                cursor: scrolledToBottom ? "pointer" : "not-allowed",
                                opacity: scrolledToBottom ? 1 : 0.4,
                                transition:"all .15s",
                              }}
                          >
                            {accepted && <CheckCircle2 size={12} style={{ color:"var(--primary-foreground)" }} />}
                          </div>
                          <span style={{ fontSize:13, color: scrolledToBottom ? "var(--foreground)" : "var(--muted-foreground)", lineHeight:1.4 }}>
                      I have read and agree to the{" "}
                            <span style={{ color:"var(--primary)", fontWeight:500 }}>
                        {legalDoc?.title ?? "Terms & Conditions"}
                      </span>
                            {legalDoc?.publishedAt && (
                                <span style={{ color:"var(--muted-foreground)", fontWeight:300 }}>
                          {" "}(updated {new Date(legalDoc.publishedAt).toLocaleDateString("en-ZA", { day:"numeric", month:"long", year:"numeric" })})
                        </span>
                            )}
                    </span>
                        </label>

                        <Button
                            variant="gold"
                            size="lg"
                            fullWidth
                            disabled={!accepted || !scrolledToBottom}
                            loading={accepting}
                            onClick={acceptTerms}
                        >
                          Accept &amp; continue
                        </Button>
                      </div>
                    </>
                )}
              </GlassCard>
          )}
        </div>
      </div>
  );
}


function FieldWrap({ icon, label, type = "text", placeholder, value, onChange }: {
  icon: React.ReactNode; label: string; type?: string;
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
      <div>
        <label className="label-mono" style={{ display:"block", marginBottom:5, color:"var(--muted-foreground)" }}>{label}</label>
        <div
            style={{ display:"flex", alignItems:"center", gap:10, background:"var(--input)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"0 12px", transition:"border-color .15s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <span style={{ color:"var(--muted-foreground)", flexShrink:0 }}>{icon}</span>
          <input
              type={type} placeholder={placeholder} value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"11px 0", fontSize:14, color:"var(--foreground)" }}
          />
        </div>
      </div>
  );
}