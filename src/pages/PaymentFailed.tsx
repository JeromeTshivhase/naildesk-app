import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
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
        {/* Red band */}
        <div style={{
          background: "linear-gradient(135deg, oklch(0.60 0.20 25 / 0.12), oklch(0.55 0.18 20 / 0.06))",
          borderBottom: "1px solid var(--border)",
          padding: "32px 24px 28px",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(0.55 0.22 25), oklch(0.50 0.20 20))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 4px 20px oklch(0.55 0.22 25 / 0.30)",
            animation: "popIn .4s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <XCircle size={30} color="#fff" />
          </div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "0 0 6px", color: "var(--foreground)" }}>
            Payment Failed
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
            Something went wrong
          </p>
        </div>

        <div style={{ padding: "24px 24px 28px" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0 0 16px" }}>
            We weren't able to process your payment. Your card has not been charged.
          </p>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0 0 20px" }}>
            Please try again using the link your nail technician sent, or contact them directly to arrange payment.
          </p>
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
    </div>
  );
}
