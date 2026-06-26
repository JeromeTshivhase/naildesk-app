import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, ArrowRight, ArrowLeft, ShieldCheck, MessageCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui";

const schema = z.object({
    phone: z.string().min(7, "Phone number is required"),
});
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const nav = useNavigate();
    const [sent, setSent] = useState(false);
    const [submittedPhone, setSubmittedPhone] = useState("");

    const { register, handleSubmit, formState: { errors } } = useForm<Form>({
        resolver: zodResolver(schema),
    });

    const request = useMutation({
        mutationFn: async (v: Form) => {
            await api.post("/auth/forgot-password", {
                phone: v.phone.replace(/\s/g, ""),
            });
            return v.phone.replace(/\s/g, "");
        },
        onSuccess: (phone) => {
            setSubmittedPhone(phone);
            setSent(true);
        },
        onError: () => {
            // Always show success to prevent enumeration — same as backend
            setSent(true);
        },
    });

    return (
        <div
            style={{
                minHeight: "100dvh",
                width: "100%",
                display: "grid",
                position: "relative",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
            }}
            className="bg-app page-glow lg-grid-split animate-fade-in standalone-safe-bounds"
        >
            {/* Hero Panel */}
            <div
                className="hero-side border-r"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "48px",
                    position: "relative",
                    overflow: "hidden",
                    borderColor: "var(--border)",
                    background: "radial-gradient(ellipse 100% 100% at 0% 0%, var(--muted) 0%, transparent 80%)",
                }}
            >
                <div style={{ position: "relative", zIndex: 10 }}>
                    <img
                        src="/brand/naildesk-wordmark-transparent.png"
                        alt="NailDesk"
                        style={{ height: "36px", objectFit: "contain" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                </div>

                <div style={{ position: "relative", zIndex: 10, maxWidth: "340px", margin: "auto 0" }} className="animate-fade-up">
                    <h2 className="serif" style={{ fontSize: "38px", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: "1.2", marginBottom: "16px" }}>
                        Recovery sent directly to your{" "}
                        <span style={{ color: "var(--primary)", fontStyle: "italic" }}>WhatsApp.</span>
                    </h2>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6", fontWeight: 300 }}>
                        Your OTP is delivered to your registered number — the same channel your clients use to book with you.
                    </p>
                </div>

                <div className="label-mono" style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)" }}>
                    <ShieldCheck size={14} style={{ color: "var(--primary)" }} />
                    Secured by NailDesk Ledger Core
                </div>
            </div>

            {/* Form Panel */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", position: "relative" }}>
                <div style={{ width: "100%", maxWidth: "380px", margin: "0 auto" }}>

                    <div style={{ marginBottom: "28px" }}>
                        <div className="logo-mobile" style={{ marginBottom: "24px" }}>
                            <img
                                src="/brand/naildesk-wordmark-transparent.png"
                                alt="NailDesk"
                                style={{ height: "32px", objectFit: "contain" }}
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                        </div>

                        {!sent ? (
                            <>
                                <h1 className="serif animate-fade-up" style={{ fontSize: "32px", fontWeight: 400, marginBottom: "6px" }}>
                                    Recover access
                                </h1>
                                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 300 }}>
                                    Enter your registered phone number. We'll send a one-time code to your WhatsApp.
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="serif animate-fade-up" style={{ fontSize: "32px", fontWeight: 400, marginBottom: "6px" }}>
                                    Check WhatsApp
                                </h1>
                                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 300 }}>
                                    If that number is registered, a 6-digit code is on its way.
                                </p>
                            </>
                        )}
                    </div>

                    {!sent ? (
                        <div className="paper-card animate-fade-up" style={{ padding: "28px", animationDelay: "0.1s" }}>
                            <form onSubmit={handleSubmit((v) => request.mutate(v))} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                                <div>
                                    <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                                        Registered Phone Number
                                    </label>
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                      <Phone size={14} />
                    </span>
                                        <input
                                            type="tel"
                                            autoComplete="tel"
                                            placeholder="+27 82 123 4567"
                                            className="nd-input"
                                            style={{ paddingLeft: "38px", userSelect: "text", WebkitUserSelect: "text" }}
                                            {...register("phone")}
                                        />
                                    </div>
                                    {errors.phone && (
                                        <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.phone.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    variant="gold"
                                    size="lg"
                                    fullWidth
                                    loading={request.isPending}
                                    style={{ marginTop: "4px" }}
                                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    Send Reset Code <ArrowRight size={14} />
                  </span>
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="paper-card animate-fade-up" style={{ padding: "28px", animationDelay: "0.1s" }}>
                            {/* WhatsApp confirmation state */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
                                <div style={{
                                    width: "56px", height: "56px", borderRadius: "50%",
                                    background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <MessageCircle size={24} style={{ color: "var(--primary)" }} />
                                </div>

                                <div>
                                    <p style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500, marginBottom: "4px" }}>
                                        Code sent via WhatsApp
                                    </p>
                                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                                        Open WhatsApp and copy the 6-digit code, then enter it on the next screen.
                                    </p>
                                </div>

                                <Button
                                    variant="gold"
                                    size="lg"
                                    fullWidth
                                    onClick={() => nav(`/reset-password?phone=${encodeURIComponent(submittedPhone)}`)}
                                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    Enter Code <ArrowRight size={14} />
                  </span>
                                </Button>

                                <button
                                    onClick={() => setSent(false)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--muted-foreground)", fontFamily: "var(--label-mono)" }}
                                    className="label-mono"
                                >
                                    Use a different number
                                </button>
                            </div>
                        </div>
                    )}

                    <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "24px" }}>
                        <Link to="/login" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ArrowLeft size={12} /> Back to login
                        </Link>
                    </p>

                </div>
            </div>

            <style>{`
        @media (min-width: 1024px) {
          .lg-grid-split { grid-template-columns: 5fr 7fr !important; }
          .logo-mobile { display: none !important; }
        }
        @media (max-width: 1023px) {
          .hero-side { display: none !important; }
        }
        @media (display-mode: standalone) {
          .standalone-safe-bounds {
            padding-top: env(safe-area-inset-top, 0px) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          }
        }
      `}</style>
        </div>
    );
}