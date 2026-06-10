import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { GlassCard, Button } from "../components/ui";

const schema = z.object({
  phone:    z.string().min(7, "Phone required"),
  password: z.string().min(6, "Min 6 characters"),
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
       const { data } = await api.post("/auth/login", { phone: v.phone.replace(/\s/g, ""), password: v.password });
       return data;
     },
      onSuccess: (data) => {
        try {
          if (!data || (!data.techId && !data.user?.id)) {
            console.error("[Login] No user ID in response:", data);
            toast.error("Invalid response from server. Please try again.");
            return;
          }

          const user = {
            id: data.techId ?? data.user?.id,
            fullName: data.fullName ?? data.user?.fullName,
            businessName: data.user?.businessName,
            isMobile: data.user?.mobile ?? data.user?.isMobile,
            phone: data.user?.phone,
          };
          const tokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };

          loginSuccess(user, tokens);

          toast.success("Welcome back");
          nav("/", { replace: true });
        } catch (e) {
          console.error("[Login] Error during login success handler:", e);
          toast.error("An error occurred. Please try again.");
        }
      },
     onError: (e: any) => {
       console.error("[Login] Login error:", e);
       toast.error(e?.response?.data?.message ?? "Sign-in failed");
     },
   });

  return (
    <div style={{
      minHeight:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"40px 24px",
      background:"radial-gradient(ellipse 80% 55% at 50% 0%, oklch(0.94 0.045 25) 0%, transparent 62%), var(--background)",
      position:"relative", overflow:"hidden",
    }}>
      {/* Ambient glow */}
      <div className="animate-pulse-glow" style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.72 0.12 55 / 0.08) 0%, transparent 70%)",
      }} />
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:200, pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 40% at 50% 100%, oklch(0.78 0.08 340 / 0.1) 0%, transparent 70%)",
      }} />

      <div style={{ width:"100%", maxWidth:400, position:"relative" }}>
        {/* Logo */}
        <div className="animate-float" style={{ textAlign:"center", marginBottom:36 }}>
          <img
            src="/brand/naildesk-wordmark-transparent.png"
            alt="NailDesk"
            style={{ height:44, width:"auto", objectFit:"contain", margin:"0 auto", display:"block" }}
            onError={(e) => {
              // Fallback to text wordmark
              const el = e.currentTarget;
              el.style.display = "none";
              const parent = el.parentElement!;
              const h = document.createElement("h1");
              h.className = "serif";
              h.style.cssText = "font-size:48px;font-weight:400;line-height:1;";
              h.innerHTML = `Nail<span style="color:var(--primary);font-style:italic">Desk</span>`;
              parent.appendChild(h);
            }}
          />
          <p className="label-mono" style={{ color:"var(--muted-foreground)", marginTop:8 }}>
            Studio management
          </p>
        </div>

        <GlassCard style={{ padding:28, position:"relative", overflow:"hidden" }}>
          {/* Top shimmer line */}
          <div style={{
            position:"absolute", top:0, left:32, right:32, height:1, borderRadius:99,
            background:"linear-gradient(90deg, transparent, oklch(0.72 0.12 55 / 0.6), transparent)",
          }} />

          <h1 className="serif" style={{ fontSize:28, fontWeight:400, marginBottom:4 }}>Welcome back</h1>
          <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginBottom:24 }}>Sign in to your studio.</p>

          <form onSubmit={handleSubmit((v) => login.mutate(v))} noValidate style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Phone */}
            <div>
              <label className="label-mono" style={{ display:"block", marginBottom:6, color: errors.phone ? "var(--destructive)" : "var(--muted-foreground)" }}>Phone</label>
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--input)", border:`1px solid ${errors.phone ? "var(--destructive)" : "var(--border)"}`, borderRadius:"var(--radius)", padding:"0 12px", transition:"border-color .15s" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = errors.phone ? "var(--destructive)" : "var(--primary)")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = errors.phone ? "var(--destructive)" : "var(--border)")}
              >
                <Phone size={14} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                <input
                  type="tel" autoComplete="tel"
                  placeholder="082 123 4567"
                  style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"12px 0", fontSize:14, color:"var(--foreground)", fontFamily:"'SF Mono',monospace", letterSpacing:".04em" }}
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p style={{ fontSize:12, color:"var(--destructive)", marginTop:4 }}>{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label-mono" style={{ display:"block", marginBottom:6, color: errors.password ? "var(--destructive)" : "var(--muted-foreground)" }}>Password</label>
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--input)", border:`1px solid ${errors.password ? "var(--destructive)" : "var(--border)"}`, borderRadius:"var(--radius)", padding:"0 12px" }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = errors.password ? "var(--destructive)" : "var(--primary)")}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = errors.password ? "var(--destructive)" : "var(--border)")}
              >
                <Lock size={14} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
                <input
                  type={showPw ? "text" : "password"} autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"12px 0", fontSize:14, color:"var(--foreground)", fontFamily:"'SF Mono',monospace", letterSpacing:".04em" }}
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", alignItems:"center" }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p style={{ fontSize:12, color:"var(--destructive)", marginTop:4 }}>{errors.password.message}</p>}
            </div>

            <Button type="submit" variant="gold" size="lg" fullWidth loading={login.isPending}>
              Sign in
            </Button>
          </form>
        </GlassCard>

        <p style={{ textAlign:"center", fontSize:13, color:"var(--muted-foreground)", marginTop:20 }}>
          New here?{" "}
          <Link to="/register" style={{ color:"var(--primary)", fontWeight:500, textDecoration:"none" }}>
            Create your studio →
          </Link>
        </p>
      </div>
    </div>
  );
}
