import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { fmt } from "../lib/fmt";

const API_BASE = "https://naildesk-api-prod.up.railway.app";

interface PaymentInfo {
  clientName:     string;
  businessName:   string;
  serviceName:    string;
  appointmentDate: string;
  amount:         number;
  paymentUrl:     string;
  expired:        boolean;
  alreadyPaid:    boolean;
}

type State =
  | { phase: "loading" }
  | { phase: "ready";   info: PaymentInfo }
  | { phase: "expired" }
  | { phase: "paid" }
  | { phase: "error";   message: string };

export default function PaymentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!slug) { setState({ phase: "error", message: "Invalid payment link." }); return; }

    // We hit the backend redirect endpoint and intercept the response
    // /pay/{slug} either returns the Paystack URL (via auto-POST form) or an error page.
    // Instead we fetch the public payment-info endpoint to show a branded page first.
    fetch(`${API_BASE}/api/v1/public/payment-info/${slug}`)
      .then(async (r) => {
        if (r.status === 404) throw new Error("not_found");
        if (r.status === 410) throw new Error("expired");
        if (!r.ok) throw new Error("server_error");
        return r.json() as Promise<PaymentInfo>;
      })
      .then((info) => {
        if (info.alreadyPaid) { setState({ phase: "paid" }); return; }
        if (info.expired)     { setState({ phase: "expired" }); return; }
        setState({ phase: "ready", info });
      })
      .catch((e: Error) => {
        if (e.message === "expired") { setState({ phase: "expired" }); return; }
        if (e.message === "not_found") {
          setState({ phase: "error", message: "This payment link doesn't exist or has been removed." });
          return;
        }
        // Fallback: just redirect straight to /pay/{slug} on the backend
        // This keeps things working even if the public endpoint isn't deployed yet
        window.location.href = `${API_BASE}/pay/${slug}`;
      });
  }, [slug]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <img
          src="/brand/naildesk-logo.png"
          alt="NailDesk"
          width={160}
          style={{ objectFit: "contain" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const h = document.createElement("h1");
            h.className = "serif";
            h.style.cssText = "font-size:28px;font-weight:400;line-height:1;color:var(--foreground);margin:0;";
            h.innerHTML = `Nail<span style="color:var(--primary);font-style:italic">Desk</span>`;
            e.currentTarget.parentElement?.appendChild(h);
          }}
        />
      </div>

      {state.phase === "loading" && (
        <div style={{ textAlign: "center" }}>
          <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin .7s linear infinite" }} />
          <p style={{ color: "var(--muted-foreground)", marginTop: 16, fontSize: 14 }}>Loading payment details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state.phase === "ready" && <ReadyState info={state.info} slug={slug!} />}

      {state.phase === "expired" && (
        <StatusCard
          icon={<AlertCircle size={40} style={{ color: "var(--destructive)" }} />}
          title="Link Expired"
          body="This payment link has expired. Please ask your nail technician to send you a new one."
        />
      )}

      {state.phase === "paid" && (
        <StatusCard
          icon={<ShieldCheck size={40} style={{ color: "oklch(0.60 0.14 155)" }} />}
          title="Already Paid"
          body="Your deposit for this appointment has already been received. See you soon! 💅"
        />
      )}

      {state.phase === "error" && (
        <StatusCard
          icon={<AlertCircle size={40} style={{ color: "var(--destructive)" }} />}
          title="Link Not Found"
          body={state.message}
        />
      )}
    </div>
  );
}

function ReadyState({ info, slug }: { info: PaymentInfo; slug: string }) {
  const [redirecting, setRedirecting] = useState(false);

  function handlePay() {
    setRedirecting(true);
    // Go through the backend redirect which handles the Paystack auto-POST
    window.location.href = `${API_BASE}/pay/${slug}`;
  }

  return (
    <div style={{
      width: "100%",
      maxWidth: 400,
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      boxShadow: "0 4px 24px oklch(0 0 0 / 0.06)",
    }}>
      {/* Header band */}
      <div style={{
        background: "linear-gradient(135deg, oklch(0.62 0.24 350 / 0.12), oklch(0.72 0.12 55 / 0.08))",
        borderBottom: "1px solid var(--border)",
        padding: "24px 24px 20px",
      }}>
        <p className="label-mono" style={{ color: "var(--primary)", marginBottom: 6 }}>DEPOSIT REQUEST</p>
        <h2 className="serif" style={{ fontSize: 26, fontWeight: 400, margin: 0, color: "var(--foreground)", lineHeight: 1.1 }}>
          {info.businessName}
        </h2>
      </div>

      {/* Details */}
      <div style={{ padding: "20px 24px" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 4 }}>
          Hi {info.clientName.split(" ")[0]}, a deposit is required to confirm your booking.
        </p>

        <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <DetailRow label="Service"     value={info.serviceName} />
          <DetailRow label="Date"        value={fmt.date(info.appointmentDate)} />
          <DetailRow label="Deposit due" value={fmt.currency(info.amount)} highlight />
        </div>

        <button
          onClick={handlePay}
          disabled={redirecting}
          className="btn-gold"
          style={{
            width: "100%",
            height: 48,
            borderRadius: "var(--radius)",
            fontSize: 15,
            fontWeight: 500,
            border: "none",
            cursor: redirecting ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {redirecting
            ? <><Loader2 size={16} style={{ animation: "spin .7s linear infinite" }} /> Redirecting…</>
            : <>Pay {fmt.currency(info.amount)} securely</>
          }
        </button>

        <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
          <ShieldCheck size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          Secured by Paystack · Your card details are never shared with us
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{
        fontSize: highlight ? 18 : 14,
        fontWeight: highlight ? 600 : 500,
        color: highlight ? "var(--foreground)" : "var(--foreground)",
        fontFamily: highlight ? "Cormorant Garamond, serif" : "inherit",
      }}>{value}</span>
    </div>
  );
}

function StatusCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      width: "100%",
      maxWidth: 360,
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "40px 32px",
      textAlign: "center",
      boxShadow: "0 4px 24px oklch(0 0 0 / 0.06)",
    }}>
      <div style={{ marginBottom: 16 }}>{icon}</div>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 400, margin: "0 0 12px", color: "var(--foreground)" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}
