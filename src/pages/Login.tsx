import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui";

const schema = z.object({
  phone:    z.string().min(7, "Phone required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const nav = useNavigate();
  const loginSuccess = useAuth((s) => s.loginSuccess);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const login = useMutation({
    mutationFn: async (v: Form) => {
      const { data } = await api.post("/auth/login", {
        phone: v.phone.replace(/\s/g, ""),
        password: v.password
      });
      return data;
    },
    onSuccess: (data) => {
      try {
        if (!data || (!data.techId && !data.user?.id)) {
          toast.error("Authentication mapping failed");
          return;
        }
        loginSuccess({
          id: data.techId ?? data.user?.id,
          fullName: data.fullName ?? data.user?.fullName,
          businessName: data.businessName ?? data.user?.businessName,
          isMobile: data.isMobile ?? data.user?.isMobile ?? data.user?.mobile,
          phone: data.phone ?? data.user?.phone,
        }, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        nav("/", { replace: true });
      } catch (err) {
        toast.error("Session configuration error");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Invalid phone or password");
    }
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
            WebkitTouchCallout: "none"
          }}
          className="bg-app page-glow lg-grid-split animate-fade-in standalone-safe-bounds"
      >

        {/* Editorial Left Hero Panel (Hidden on standalone mobile installation viewports) */}
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
              The workspace for elite <span style={{ color: "var(--primary)", fontStyle: "italic" }}>nail professionals.</span>
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6", fontWeight: 300 }}>
              Manage bookings, deposits, and your client portfolio — all from one place.
            </p>
          </div>

          <div className="label-mono" style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)" }}>
            <ShieldCheck size={14} style={{ color: "var(--primary)" }} />
            Protected by NailDesk
          </div>
        </div>

        {/* Interactive Authentication Segment */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", position: "relative" }}>
          <div style={{ width: "100%", maxWidth: "380px", margin: "0 auto" }}>

            {/* Header Typography Group */}
            <div style={{ marginBottom: "28px" }}>
              <div className="logo-mobile" style={{ marginBottom: "24px" }}>
                <img
                    src="/brand/naildesk-wordmark-transparent.png"
                    alt="NailDesk"
                    style={{ height: "32px", objectFit: "contain" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <h1 className="serif animate-fade-up" style={{ fontSize: "32px", fontWeight: 400, marginBottom: "6px" }}>
                Welcome back
              </h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: 300 }}>
                Sign in to your NailDesk account.
              </p>
            </div>

            {/* Form Wrapped in your native .paper-card utility */}
            <div className="paper-card animate-fade-up" style={{ padding: "28px", animationDelay: "0.1s" }}>
              <form onSubmit={handleSubmit((v) => login.mutate(v))} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                {/* Phone Entry Component */}
                <div>
                  <label className="label-mono" style={{ display: "block", marginBottom: "6px", color: "var(--muted-foreground)" }}>
                    Phone number
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                    <Phone size={14} />
                  </span>
                    <input
                        type="tel"
                        autoComplete="username"
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

                {/* Password Entry Component */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <label className="label-mono" style={{ color: "var(--muted-foreground)" }}>
                      Password
                    </label>
                    <Link to="/forgot" style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 500, textDecoration: "none" }} className="label-mono">
                      Forgot?
                    </Link>
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: "14px", color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
                    <Lock size={14} />
                  </span>
                    <input
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="nd-input"
                        style={{
                          paddingLeft: "38px",
                          paddingRight: "40px",
                          letterSpacing: showPw ? "normal" : "0.15em",
                          userSelect: "text",
                          WebkitUserSelect: "text"
                        }}
                        {...register("password")}
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
                  {errors.password && (
                      <p style={{ fontSize: "11px", fontFamily: "var(--label-mono)", color: "var(--destructive)", marginTop: "5px" }}>{errors.password.message}</p>
                  )}
                </div>

                {/* Action Trigger Button */}
                <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    fullWidth
                    loading={login.isPending}
                    style={{ marginTop: "4px" }}
                >
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  Sign in <ArrowRight size={14} />
                </span>
                </Button>
              </form>
            </div>

            {/* Core App Pivot Anchor Layout */}
            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "24px" }}>
              New to the platform?{" "}
              <Link to="/register" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}>
                Create your studio →
              </Link>
            </p>

          </div>
        </div>

        {/* Standalone Display Mode Fixes */}
        <style>{`
        @media (min-width: 1024px) {
          .lg-grid-split { grid-template-columns: 5fr 7fr !important; }
          .logo-mobile { display: none !important; }
        }
        @media (max-width: 1023px) {
          .hero-side { display: none !important; }
        }
        
        /* Handles iOS/Android hardware status bars when running as an installed standalone PWA app */
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
