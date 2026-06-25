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

  // Auth data from /auth/register
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
      await api.post("/legal/accept", { versionId: legalDoc.versionId }).catch(() => {});
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

  return (
      <div style={{
        minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"40px 24px",
        background:"radial-gradient(circle at 50% -10%, var(--primary-muted, rgba(var(--primary-rgb), 0.12)) 0%, transparent 70%), var(--background)",
        position:"relative",
      }}>
        <div style={{ width:"100%", maxWidth: 420 }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <img
                src="/brand/naildesk-wordmark-transparent.png"
                alt="NailDesk"
                style={{ height:44, objectFit:"contain", margin:"0 auto", display:"block" }}
                onError={(e) => { e.currentTarget.style.display="none"; }}
            />
          </div>

          {/* Step indicator */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:16 }}>
            {(["form","terms"] as Step[]).map((s, i) => {
              const done    = ["form","terms"].indexOf(step) > i;
              const current = step === s;
              return (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{
                      width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, transition:"all .2s",
                      background: done || current ? "var(--primary)" : "var(--border)",
                      color: done || current ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    }}>
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    {i < 1 && <div style={{ width:32, height:1, background: done ? "var(--primary)" : "var(--border)" }} />}
                  </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"0 6px", marginBottom:24 }}>
            {["Details","Terms"].map((l, i) => (
                <span key={l} className="label-mono" style={{ color: ["form","terms"].indexOf(step) === i ? "var(--primary)" : "var(--muted-foreground)", fontSize:10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</span>
            ))}
          </div>

          {/* Step 1: Form */}
          {step === "form" && (
              <GlassCard style={{ padding:28, border: "1px solid var(--border)" }}>
                <h1 className="serif" style={{ fontSize:28, fontWeight:400, marginBottom:4, letterSpacing: "-0.01em" }}>Create account</h1>
                <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:24 }}>
                  Set up your studio in minutes.
                </p>

                <form onSubmit={submitForm} noValidate style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <FieldWrap icon={<User size={14} />}     label="Full name *"     placeholder="Zandi Mahlangu"      type="text"     value={form.fullName}     onChange={(v) => set("fullName", v)} />
                  <FieldWrap icon={<Building2 size={14} />} label="Business name"  placeholder="Nails by Zandi"      type="text"     value={form.businessName} onChange={(v) => set("businessName", v)} />
                  <FieldWrap icon={<Phone size={14} />}    label="Phone number *"  placeholder="+27 82 123 4567"     type="tel"      value={form.phone}        onChange={(v) => set("phone", v)} />
                  <FieldWrap icon={<Lock size={14} />}     label="Password *"      placeholder="Min. 8 characters"   type="password" value={form.password}     onChange={(v) => set("password", v)} />

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--secondary)", border: "1px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px", marginTop: 4 }}>
                    <div>
                      <p style={{ fontSize:14, fontWeight:500 }}>Mobile technician</p>
                      <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight: 300 }}>I travel to clients</p>
                    </div>
                    <Toggle checked={form.isMobile} onChange={(v) => set("isMobile", v)} />
                  </div>

                  <Button type="submit" variant="gold" size="lg" fullWidth loading={loading} style={{ marginTop:8, height: 48 }}>
                    Create account
                  </Button>
                </form>

                <p style={{ textAlign:"center", fontSize:13, color:"var(--muted-foreground)", marginTop:24 }}>
                  Already registered?{" "}
                  <Link to="/login" style={{ color:"var(--primary)", fontWeight:500, textDecoration:"none" }}>Sign in →</Link>
                </p>
              </GlassCard>
          )}

          {/* Step 2: Terms & Conditions */}
          {step === "terms" && (
              <GlassCard style={{ padding:0, overflow:"hidden", border: "1px solid var(--border)" }}>
                {/* Header */}
                <div style={{ padding:"24px 24px 18px", borderBottom:"1px solid var(--border)", background: "var(--card)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <FileText size={16} style={{ color:"var(--primary)" }} />
                    </div>
                    <div>
                      <p className="label-mono" style={{ color:"var(--primary)", fontSize: 10, textTransform: "uppercase" }}>Step 2 of 2</p>
                      <h1 className="serif" style={{ fontSize:22, fontWeight:400, lineHeight:1.2 }}>
                        {legalDoc?.title ?? "Terms & Conditions"}
                      </h1>
                    </div>
                  </div>
                  <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300 }}>
                    Please read and accept to complete your registration.
                  </p>
                </div>

                {/* Content Container */}
                {legalLoading ? (
                    <div style={{ padding:48, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                      <Loader2 size={24} className="animate-spin" style={{ color:"var(--primary)" }} />
                      <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>Loading terms…</p>
                    </div>
                ) : (
                    <>
                      <div
                          ref={scrollRef}
                          onScroll={handleScroll}
                          style={{
                            height:280, overflowY:"auto", padding:"20px 24px",
                            fontSize:13, lineHeight:1.7, color:"var(--foreground)",
                            fontWeight:300,
                            background:"var(--secondary)",
                            borderBottom:"1px solid var(--border)",
                          }}
                      >
                        <MarkdownContent content={legalDoc?.content ?? ""} />
                      </div>

                      {/* Scroll hint */}
                      {!scrolledToBottom && (
                          <div style={{ padding:"10px 24px", background:"var(--card)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12, color:"var(--primary)", fontStyle:"italic", fontWeight: 400 }}>
                      Scroll to the bottom to unlock acceptance ↓
                    </span>
                          </div>
                      )}

                      {/* Accept section */}
                      <div style={{ padding:"20px 24px 24px" }}>
                        <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor: scrolledToBottom ? "pointer" : "not-allowed", marginBottom:20 }}>
                          <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: 2 }}>
                            <input
                                type="checkbox"
                                checked={accepted}
                                disabled={!scrolledToBottom}
                                onChange={(e) => setAccepted(e.target.checked)}
                                style={{
                                  position: "absolute", opacity: 0, width: 20, height: 20, margin: 0, cursor: scrolledToBottom ? "pointer" : "not-allowed"
                                }}
                            />
                            <div
                                style={{
                                  width:20, height:20, borderRadius:6, flexShrink:0,
                                  border:`2px solid ${accepted ? "var(--primary)" : scrolledToBottom ? "var(--border)" : "var(--border-muted)"}`,
                                  background: accepted ? "var(--primary)" : "transparent",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  pointerEvents: "none",
                                  opacity: scrolledToBottom ? 1 : 0.5,
                                  transition:"all .15s",
                                }}
                            >
                              {accepted && <CheckCircle2 size={12} style={{ color:"var(--primary-foreground)" }} />}
                            </div>
                          </div>
                          <span style={{ fontSize:13, color: scrolledToBottom ? "var(--foreground)" : "var(--muted-foreground)", lineHeight:1.4, userSelect: "none" }}>
                      I have read and agree to the{" "}
                            <span style={{ color:"var(--primary)", fontWeight:500 }}>
                        {legalDoc?.title ?? "Terms & Conditions"}
                      </span>
                            {legalDoc?.publishedAt && (
                                <span style={{ color:"var(--muted-foreground)", fontWeight:300, fontSize: 12 }}>
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
                            style={{ height: 48, fontWeight: 600 }}
                        >
                          Accept &amp; complete signup
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

function MarkdownContent({ content }: { content: string }) {
  const nodes: React.ReactNode[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    nodes.push(
        <p key={`p-${nodes.length}`} style={{ margin:"0 0 12px", color:"var(--foreground)" }}>
          {renderInline(paragraph.join(" "))}
        </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    nodes.push(
        <ul key={`ul-${nodes.length}`} style={{ margin:"0 0 14px", paddingLeft:20, display:"flex", flexDirection:"column", gap:6 }}>
          {list.map((item, i) => (
              <li key={i} style={{ paddingLeft:2 }}>
                {renderInline(item)}
              </li>
          ))}
        </ul>
    );
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph();
      flushList();
      nodes.push(<hr key={`hr-${nodes.length}`} style={{ border:0, borderTop:"1px solid var(--border)", margin:"16px 0" }} />);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      nodes.push(renderHeading(heading[1].length, heading[2], `h-${nodes.length}`));
      continue;
    }

    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return <div>{nodes}</div>;
}

function renderHeading(level: number, text: string, key: string) {
  const base = { margin:"0 0 10px", fontWeight:600, lineHeight:1.25, color:"var(--foreground)" } as const;
  if (level === 1) return <h2 key={key} className="serif" style={{ ...base, fontSize:22, fontWeight:500 }}>{renderInline(text)}</h2>;
  if (level === 2) return <h3 key={key} className="serif" style={{ ...base, fontSize:19, fontWeight:500 }}>{renderInline(text)}</h3>;
  return <h4 key={key} style={{ ...base, fontSize:15, marginTop:4 }}>{renderInline(text)}</h4>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight:600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} style={{ fontFamily:"var(--label-mono)", fontSize:"0.9em", background:"var(--muted)", border:"1px solid var(--border)", borderRadius:4, padding:"1px 4px" }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function FieldWrap({ icon, label, type = "text", placeholder, value, onChange }: {
  icon: React.ReactNode; label: string; type?: string;
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
      <div>
        <label className="label-mono" style={{ display:"block", marginBottom:6, color:"var(--muted-foreground)", fontSize: 11, textTransform: "uppercase" }}>{label}</label>
        <div
            style={{ display:"flex", alignItems:"center", gap:10, background:"var(--input)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"0 14px", transition:"border-color .15s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <span style={{ color:"var(--muted-foreground)", flexShrink:0 }}>{icon}</span>
          <input
              type={type} placeholder={placeholder} value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"12px 0", fontSize:14, color:"var(--foreground)" }}
          />
        </div>
      </div>
  );
}
