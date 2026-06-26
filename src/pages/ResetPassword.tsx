import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "../components/ui";

const schema = z.object({
    phone:       z.string().min(7, "Phone number is required"),
    otpCode:     z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirm:     z.string(),
}).refine((d) => d.newPassword === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
});
type Form = z.infer<typeof schema>;

export default function ResetPasswordPage() {
    const nav = useNavigate();
    const [params] = useSearchParams();
    const [showPw, setShowPw]         = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [done, setDone]             = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<Form>({
        resolver: zodResolver(schema),
        defaultValues: {
            phone: params.get("phone") ?? "",
        },
    });

    const reset = useMutation({
        mutationFn: async (v: Form) => {
            await api.post("/auth/reset-password", {
                phone:       v.phone.replace(/\s/g, ""),
                otpCode:     v.otpCode,
                newPassword: v.newPassword,
            });
        },
        onSuccess: () => {
            setDone(true);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Could not reset password. Check your code and try again.");
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
                        Set your new{" "}
                        <span style={{ color: "var(--primary)", fontStyle: "italic" }}>passkey.</span>
                    </h2>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6", fontWeight: 300 }}>
                        Enter the 6-digit code from WhatsApp alongside your new password. The code expires in 10 minutes.
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

                        {!done ? (
                            <>
                                <h1 className="serif animate-fade-up" style={{ fontSize: "32px", fontWeight: 400, marginBottom: "6px" }}>
                                    Reset password
                                </h1>
                                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 300 }}>
                                    Paste your WhatsApp code and choose a new password.
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="serif animate-fade-up" style={{ fontSize: "32px", fontWeight: 400, marginBottom: "6px" }}>
                                    Password updated
                                </h1>
                                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 300 }}>
                                    Your credentials have been reset. Log in to continue.
                                </p>
                            </>
                        )}
                    </div>

                    {!done ? (
                        <div className="paper-card animate-fade-up" style={{ padding: "28px", animationDelay: "0.1s" }}>
                            <form onSubmit={handleSubmit((v) => reset.mutate(v))} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                                {/* Phone — pre-filled, editable */}
                                <div>
                                    <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="+27 82 123 4567"
                                        className="nd-input"
                                        style={{ userSelect: "text", WebkitUserSelect: "text" }}
                                        {...register("phone")}
                                    />
                                    {errors.phone && (
                                        <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.phone.message}</p>
                                    )}
                                </div>

                                {/* OTP */}
                                <div>
                                    <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                                        WhatsApp Verification Code
                                    </label>
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                      <KeyRound size={14} />
                    </span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="123456"
                                            maxLength={6}
                                            className="nd-input"
                                            style={{
                                                paddingLeft: "38px",
                                                letterSpacing: "0.3em",
                                                fontWeight: 600,
                                                userSelect: "text",
                                                WebkitUserSelect: "text",
                                            }}
                                            {...register("otpCode")}
                                        />
                                    </div>
                                    {errors.otpCode && (
                                        <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.otpCode.message}</p>
                                    )}
                                </div>

                                {/* New password */}
                                <div>
                                    <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                                        New Passkey
                                    </label>
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                      <Lock size={14} />
                    </span>
                                        <input
                                            type={showPw ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Min. 8 characters"
                                            className="nd-input"
                                            style={{
                                                paddingLeft: "38px",
                                                paddingRight: "40px",
                                                letterSpacing: showPw ? "normal" : "0.15em",
                                                userSelect: "text",
                                                WebkitUserSelect: "text",
                                            }}
                                            {...register("newPassword")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(!showPw)}
                                            aria-label={showPw ? "Hide password" : "Show password"}
                                            style={{ position: "absolute", right: "14px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}
                                        >
                                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    {errors.newPassword && (
                                        <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.newPassword.message}</p>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                                        Confirm New Passkey
                                    </label>
                                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                      <Lock size={14} />
                    </span>
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Repeat password"
                                            className="nd-input"
                                            style={{
                                                paddingLeft: "38px",
                                                paddingRight: "40px",
                                                letterSpacing: showConfirm ? "normal" : "0.15em",
                                                userSelect: "text",
                                                WebkitUserSelect: "text",
                                            }}
                                            {...register("confirm")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            aria-label={showConfirm ? "Hide password" : "Show password"}
                                            style={{ position: "absolute", right: "14px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0 }}
                                        >
                                            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    {errors.confirm && (
                                        <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.confirm.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    variant="gold"
                                    size="lg"
                                    fullWidth
                                    loading={reset.isPending}
                                    style={{ marginTop: "4px" }}
                                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    Set New Password <ArrowRight size={14} />
                  </span>
                                </Button>
                            </form>
                        </div>
                    ) : (
                        <div className="paper-card animate-fade-up" style={{ padding: "28px", animationDelay: "0.1s" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
                                <div style={{
                                    width: "56px", height: "56px", borderRadius: "50%",
                                    background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <ShieldCheck size={24} style={{ color: "var(--primary)" }} />
                                </div>
                                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                                    Your password has been updated. You can now log in with your new credentials.
                                </p>
                                <Button
                                    variant="gold"
                                    size="lg"
                                    fullWidth
                                    onClick={() => nav("/login", { replace: true })}
                                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    Go to Login <ArrowRight size={14} />
                  </span>
                                </Button>
                            </div>
                        </div>
                    )}

                    <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "24px" }}>
                        <Link to="/forgot" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ArrowLeft size={12} /> Request a new code
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