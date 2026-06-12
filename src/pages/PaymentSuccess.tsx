import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

const API_BASE = "https://naildesk-api-prod.up.railway.app";

interface VerifyResult {
  status: "success" | "pending" | "failed" | "unknown";
  clientName?: string;
  businessName?: string;
  serviceName?: string;
  amount?: number;
}

type Phase = "verifying" | "success" | "pending" | "failed";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const [phase, setPhase] = useState<Phase>("verifying");
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!ref) { setPhase("success"); return; } // No ref — just show generic success

    // Poll the public verify endpoint once to get confirmation details
    fetch(`${API_BASE}/api/v1/public/payment-verify/${ref}`)
      .then(async (r) => {
        if (!r.ok) return { status: "unknown" } as VerifyResult;
        return r.json() as Promise<VerifyResult>;
      })
      .then((data) => {
        setResult(data);
        setPhase(data.status === "success" ? "success" : data.status === "pending" ? "pending" : "failed");
      })
      .catch(() => {
        // Verification endpoint not available yet — fall back to generic success
        setPhase("success");
      });
  }, [ref]);

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

      {phase === "verifying" && (
        <div style={{ textAlign: "center" }}>
          <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin .7s linear infinite" }} />
          <p style={{ color: "var(--muted-foreground)", marginTop: 16, fontSize: 14 }}>Confirming your payment…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {phase === "success" && <SuccessCard result={result} />}
      {phase === "pending" && <PendingCard />}
      {phase === "failed"  && <FailedCard />}
    </div>
  );
}

function SuccessCard({ result }: { result: VerifyResult | null }) {
  return (
    <div style={{
      width: "100%",
      maxWidth: 380,
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      overflow: "hidden",
      boxShadow: "0 4px 24px oklch(0 0 0 / 0.06)",
      textAlign: "center",
    }}>
      {/* Green band */}
      <div style={{
        background: "linear-gradient(135deg, oklch(0.60 0.14 155 / 0.15), oklch(0.50 0.12 155 / 0.08))",
        borderBottom: "1px solid var(--border)",
        padding: "32px 24px 28px",
      }}>
        {/* Animated checkmark */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.60 0.14 155), oklch(0.50 0.12 155))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 4px 20px oklch(0.60 0.14 155 / 0.35)",
          animation: "popIn .4s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>
          <CheckCircle2 size={30} color="#fff" />
        </div>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "0 0 6px", color: "var(--foreground)" }}>
          Payment Received
        </h2>
        {result?.businessName && (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
            {result.businessName}
          </p>
        )}
      </div>

      <div style={{ padding: "24px 24px 28px" }}>
        {result?.clientName && (
          <p style={{ fontSize: 15, color: "var(--foreground)", marginBottom: 8 }}>
            Thanks, {result.clientName.split(" ")[0]}!
          </p>
        )}
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Your deposit has been received and your booking is confirmed.
          You'll get a WhatsApp message shortly. 💅
        </p>

        {result?.serviceName && (
          <div style={{
            background: "var(--muted)",
            borderRadius: "calc(var(--radius) - 4px)",
            padding: "12px 16px",
            fontSize: 13,
            color: "var(--muted-foreground)",
          }}>
            {result.serviceName}
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 20, lineHeight: 1.5 }}>
          You can safely close this window.
        </p>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PendingCard() {
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
      <div style={{
        width: 56, height: 56,
        borderRadius: "50%",
        background: "var(--status-amber-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Loader2 size={24} style={{ color: "var(--status-amber-fg)", animation: "spin .7s linear infinite" }} />
      </div>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 400, margin: "0 0 12px", color: "var(--foreground)" }}>
        Payment Processing
      </h2>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
        Your payment is being processed. You'll receive a WhatsApp confirmation once it's complete.
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FailedCard() {
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
      <div style={{
        width: 56, height: 56,
        borderRadius: "50%",
        background: "var(--status-rose-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
        fontSize: 24,
      }}>
        ✕
      </div>
      <h2 className="serif" style={{ fontSize: 24, fontWeight: 400, margin: "0 0 12px", color: "var(--foreground)" }}>
        Payment Unsuccessful
      </h2>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
        The payment could not be completed. Please try again using the link your nail technician sent, or contact them directly.
      </p>
    </div>
  );
}
