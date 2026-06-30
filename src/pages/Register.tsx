import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Lock, User, Building2, FileText, CheckCircle2, Loader2, X } from "lucide-react";
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

// ── Terms modal ───────────────────────────────────────────────────────────────
function TermsModal({
  legalDoc, legalLoading, onAccept, accepting,
}: {
  legalDoc: LegalDoc | null;
  legalLoading: boolean;
  onAccept: () => void;
  accepting: boolean;
}) {
  const scrollRef            = useRef<HTMLDivElement>(null);
  const [reached, setReached] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Auto-unlock if content is short enough to need no scrolling
  useEffect(() => {
    if (legalLoading || !legalDoc) return;
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      if (el && el.scrollHeight - el.clientHeight < 40) setReached(true);
    }, 120);
    return () => clearTimeout(timer);
  }, [legalDoc, legalLoading]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setReached(true);
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
        zIndex:1000, animation:"fadeIn .2s ease",
      }} />

      {/* Sheet */}
      <div style={{
        position:"fixed", left:0, right:0, bottom:0,
        height:"92dvh",
        background:"var(--background)",
        borderRadius:"20px 20px 0 0",
        zIndex:1001,
        display:"flex", flexDirection:"column",
        animation:"slideUp .28s cubic-bezier(.32,1,.4,1)",
        boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",
        overflow:"hidden",
      }}>
        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{
          padding:"12px 20px 14px",
          borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{
            width:36, height:36, borderRadius:"50%",
            background:"var(--accent)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <FileText size={16} style={{ color:"var(--primary)" }} />
          </div>
          <div style={{ flex:1 }}>
            <p className="label-mono" style={{ color:"var(--primary)", fontSize:10, textTransform:"uppercase", marginBottom:2 }}>
              Step 2 of 2
            </p>
            <h2 className="serif" style={{ fontSize:20, fontWeight:400, lineHeight:1.2 }}>
              {legalDoc?.title ?? "Terms & Conditions"}
            </h2>
          </div>
        </div>

        {/* Scrollable content */}
        {legalLoading ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
            <Loader2 size={24} className="animate-spin" style={{ color:"var(--primary)" }} />
            <p style={{ fontSize:13, color:"var(--muted-foreground)" }}>Loading terms…</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              flex:1, overflowY:"auto", padding:"20px 20px 8px",
              fontSize:13, lineHeight:1.75, color:"var(--foreground)",
              fontWeight:300,
            }}
          >
            <MarkdownContent content={legalDoc?.content ?? ""} />

            {/* Spacer so content clears the sticky footer */}
            <div style={{ height:160 }} />
          </div>
        )}

        {/* Sticky footer — fades in once user has scrolled */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          background:"var(--background)",
          borderTop:"1px solid var(--border)",
          padding:"16px 20px 28px",
          transition:"opacity .3s, transform .3s",
          opacity: reached ? 1 : 0,
          transform: reached ? "translateY(0)" : "translateY(12px)",
          pointerEvents: reached ? "auto" : "none",
        }}>
          {/* Checkbox */}
          <label style={{
            display:"flex", alignItems:"flex-start", gap:12,
            cursor:"pointer", marginBottom:16,
          }}>
            <div style={{ position:"relative", display:"flex", alignItems:"center", marginTop:2 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ position:"absolute", opacity:0, width:20, height:20, margin:0, cursor:"pointer" }}
              />
              <div style={{
                width:20, height:20, borderRadius:6, flexShrink:0,
                border:`2px solid ${accepted ? "var(--primary)" : "var(--border)"}`,
                background: accepted ? "var(--primary)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                pointerEvents:"none", transition:"all .15s",
              }}>
                {accepted && <CheckCircle2 size={12} style={{ color:"var(--primary-foreground)" }} />}
              </div>
            </div>
            <span style={{ fontSize:13, lineHeight:1.4, userSelect:"none" }}>
              I have read and agree to the{" "}
              <span style={{ color:"var(--primary)", fontWeight:500 }}>
                {legalDoc?.title ?? "Terms & Conditions"}
              </span>
              {legalDoc?.publishedAt && (
                <span style={{ color:"var(--muted-foreground)", fontWeight:300, fontSize:12 }}>
                  {" "}(updated {new Date(legalDoc.publishedAt).toLocaleDateString("en-ZA", { day:"numeric", month:"long", year:"numeric" })})
                </span>
              )}
            </span>
          </label>

          <Button
            variant="gold" size="lg" fullWidth
            disabled={!accepted}
            loading={accepting}
            onClick={onAccept}
            style={{ height:48, fontWeight:600 }}
          >
            Accept &amp; complete signup
          </Button>
        </div>

        {/* Scroll hint */}
        {!reached && !legalLoading && (
          <div style={{
            position:"absolute", bottom:0, left:0, right:0,
            padding:"14px 20px 28px",
            background:"linear-gradient(to top, var(--background) 60%, transparent)",
            display:"flex", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <span style={{ fontSize:12, color:"var(--primary)", fontStyle:"italic" }}>
              Scroll to the bottom to accept ↓
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const nav          = useNavigate();
  const loginSuccess = useAuth((s) => s.loginSuccess);

  const [step, setStep]       = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ phone:"", password:"", fullName:"", businessName:"", isMobile:false });

  const [legalDoc, setLegalDoc]     = useState<LegalDoc | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [accepting, setAccepting]   = useState(false);
  const [pendingAuth, setPendingAuth] = useState<Record<string, any> | null>(null);

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
    <>
      {/* Terms bottom-sheet */}
      {step === "terms" && (
        <TermsModal
          legalDoc={legalDoc}
          legalLoading={legalLoading}
          onAccept={acceptTerms}
          accepting={accepting}
        />
      )}

      {/* Registration form (stays mounted behind the sheet) */}
      <div style={{
        minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"40px 24px",
        background:"radial-gradient(circle at 50% -10%, var(--primary-muted, rgba(var(--primary-rgb), 0.12)) 0%, transparent 70%), var(--background)",
      }}>
        <div style={{ width:"100%", maxWidth:420 }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <img
              src="/brand/naildesk-wordmark-transparent.png"
              alt="NailDesk"
              style={{ height:44, objectFit:"contain", margin:"0 auto", display:"block" }}
              onError={(e) => { e.currentTarget.style.display="none"; }}
            />
          </div>

          <GlassCard style={{ padding:28, border:"1px solid var(--border)" }}>
            <h1 className="serif" style={{ fontSize:28, fontWeight:400, marginBottom:4, letterSpacing:"-0.01em" }}>Create account</h1>
            <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:24 }}>
              Set up your studio in minutes.
            </p>

            <form onSubmit={submitForm} noValidate style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <FieldWrap icon={<User size={14} />}       label="Full name *"    placeholder="e.g., Jane Doe"     type="text"     value={form.fullName}     onChange={(v) => set("fullName", v)} />
              <FieldWrap icon={<Building2 size={14} />}  label="Business name"  placeholder="e.g., Beauty Salon" type="text"     value={form.businessName} onChange={(v) => set("businessName", v)} />
              <FieldWrap icon={<Phone size={14} />}      label="Phone number *" placeholder="e.g., 082 123 4567" type="tel"      value={form.phone}        onChange={(v) => set("phone", v)} />
              <FieldWrap icon={<Lock size={14} />}       label="Password *"     placeholder="••••••••"           type="password" value={form.password}     onChange={(v) => set("password", v)} />

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"12px 14px", marginTop:4 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:500 }}>Mobile technician</p>
                  <p style={{ fontSize:12, color:"var(--muted-foreground)", fontWeight:300 }}>I travel to clients</p>
                </div>
                <Toggle checked={form.isMobile} onChange={(v) => set("isMobile", v)} />
              </div>

              <Button type="submit" variant="gold" size="lg" fullWidth loading={loading} style={{ marginTop:8, height:48 }}>
                Create account
              </Button>
            </form>

            <p style={{ textAlign:"center", fontSize:13, color:"var(--muted-foreground)", marginTop:24 }}>
              Already registered?{" "}
              <Link to="/login" style={{ color:"var(--primary)", fontWeight:500, textDecoration:"none" }}>Sign in →</Link>
            </p>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  const nodes: React.ReactNode[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(<p key={`p-${nodes.length}`} style={{ margin:"0 0 12px", color:"var(--foreground)" }}>{renderInline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} style={{ margin:"0 0 14px", paddingLeft:20, display:"flex", flexDirection:"column", gap:6 }}>
        {list.map((item, i) => <li key={i} style={{ paddingLeft:2 }}>{renderInline(item)}</li>)}
      </ul>
    );
    list = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushParagraph(); flushList(); continue; }
    if (/^-{3,}$/.test(t)) { flushParagraph(); flushList(); nodes.push(<hr key={`hr-${nodes.length}`} style={{ border:0, borderTop:"1px solid var(--border)", margin:"16px 0" }} />); continue; }
    const h = /^(#{1,6})\s+(.+)$/.exec(t);
    if (h) { flushParagraph(); flushList(); nodes.push(renderHeading(h[1].length, h[2], `h-${nodes.length}`)); continue; }
    const b = /^[-*]\s+(.+)$/.exec(t);
    if (b) { flushParagraph(); list.push(b[1]); continue; }
    flushList(); paragraph.push(t);
  }
  flushParagraph(); flushList();
  return <div>{nodes}</div>;
}

function renderHeading(level: number, text: string, key: string) {
  const base = { margin:"0 0 10px", fontWeight:600, lineHeight:1.25, color:"var(--foreground)" } as const;
  if (level === 1) return <h2 key={key} className="serif" style={{ ...base, fontSize:22, fontWeight:500 }}>{renderInline(text)}</h2>;
  if (level === 2) return <h3 key={key} className="serif" style={{ ...base, fontSize:19, fontWeight:500 }}>{renderInline(text)}</h3>;
  return <h4 key={key} style={{ ...base, fontSize:15, marginTop:4 }}>{renderInline(text)}</h4>;
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ fontWeight:600 }}>{part.slice(2,-2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ fontFamily:"var(--label-mono)", fontSize:"0.9em", background:"var(--muted)", border:"1px solid var(--border)", borderRadius:4, padding:"1px 4px" }}>{part.slice(1,-1)}</code>;
    return part;
  });
}

// ── Field component ───────────────────────────────────────────────────────────
function FieldWrap({ icon, label, type="text", placeholder, value, onChange }: {
  icon: React.ReactNode; label: string; type?: string;
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label-mono" style={{ display:"block", marginBottom:6, color:"var(--muted-foreground)", fontSize:11, textTransform:"uppercase" }}>{label}</label>
      <div
        style={{ display:"flex", alignItems:"center", gap:10, background:"var(--input)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"0 14px", transition:"border-color .15s" }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
        onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
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
