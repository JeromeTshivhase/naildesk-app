import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import type { AppointmentStatus } from "../lib/api";

// ── GlassCard ──────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> { glow?: boolean; }
export function GlassCard({ className, glow, style, ...rest }: CardProps) {
  return (
    <div
      className={cn("paper-card", className)}
      style={{
        ...(glow ? { boxShadow: "0 0 0 1px oklch(0.72 0.12 55 / 0.25), 0 4px 24px oklch(0.72 0.12 55 / 0.1)" } : {}),
        ...style,
      }}
      {...rest}
    />
  );
}

// ── StatusPill ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AppointmentStatus, { bg: string; fg: string; label: string }> = {
  AWAITING_DEPOSIT: { bg: "var(--status-amber-bg)", fg: "var(--status-amber-fg)", label: "Deposit" },
  CONFIRMED:        { bg: "var(--status-sage-bg)",  fg: "var(--status-sage-fg)",  label: "Confirmed" },
  COMPLETED:        { bg: "var(--status-warm-bg)",  fg: "var(--status-warm-fg)",  label: "Done" },
  CANCELLED:        { bg: "var(--status-rose-bg)",  fg: "var(--status-rose-fg)",  label: "Cancelled" },
  NO_SHOW:          { bg: "var(--status-gray-bg)",  fg: "var(--status-gray-fg)",  label: "No Show" },
};
export function accentColor(s: AppointmentStatus) {
  return {
    AWAITING_DEPOSIT: "oklch(0.82 0.14 72)",
    CONFIRMED:        "oklch(0.72 0.12 155)",
    COMPLETED:        "oklch(0.55 0.01 260)",
    CANCELLED:        "oklch(0.72 0.14 22)",
    NO_SHOW:          "oklch(0.40 0.01 260)",
  }[s] ?? "var(--primary)";
}
export function StatusPill({ status, className }: { status: AppointmentStatus; className?: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.CONFIRMED;
  return (
    <span
      className={cn("label-mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", className)}
      style={{ background: c.bg, color: c.fg, fontSize: 9 }}
    >
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.fg, flexShrink:0, display:"inline-block" }} />
      {c.label}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("rounded-xl animate-pulse-glow", className)} style={{ background:"var(--muted)", ...style }} />;
}

// ── Button ─────────────────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "gold" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}
export function Button({
  children, loading, variant = "gold", size = "md",
  fullWidth, className, disabled, ...rest
}: BtnProps) {
  const sizes = { sm:"h-9 px-4 text-xs rounded-xl", md:"h-11 px-5 text-sm rounded-xl", lg:"h-12 px-6 text-sm rounded-xl" };
  const variants = {
    gold:    "btn-gold font-medium tracking-wide",
    outline: "bg-transparent border border-border text-foreground hover:border-primary hover:text-primary active:scale-[0.98] transition-all",
    ghost:   "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98] transition-all",
    danger:  "bg-[var(--status-rose-bg)] text-[var(--status-rose-fg)] border border-[var(--status-rose-fg)]/30 active:scale-[0.98] transition-all",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size], variants[variant], fullWidth && "w-full", className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin-icon" />}
      {children}
    </button>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  initials: string;
  size?: number;
}

export function Avatar({ initials, size = 36, style, ...rest }: AvatarProps) {
  return (
    <span style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:"linear-gradient(135deg, oklch(0.72 0.12 55 / 0.2), oklch(0.62 0.10 25 / 0.1))",
      border:"1px solid oklch(0.72 0.12 55 / 0.3)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.33, fontWeight:600, color:"oklch(0.72 0.12 55)",
      fontFamily:"Cormorant Garamond, serif",
      ...style,
    }} {...rest}>
      {initials}
    </span>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, subtitle, action, glow = true }: {
  eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; glow?: boolean;
}) {
  return (
    <div className="relative overflow-hidden px-5" style={{ paddingTop:48, paddingBottom:20 }}>
      {glow && <div className="page-glow absolute inset-0 pointer-events-none" />}
      <div className="flex items-end justify-between">
        <div>
          {eyebrow && <p className="label-mono text-primary mb-1">{eyebrow}</p>}
          <h1 className="serif" style={{ fontSize:32, fontWeight:400, lineHeight:1, color:"var(--foreground)" }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:4 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// ── SectionTitle ───────────────────────────────────────────────────────────
export function SectionTitle({ eyebrow, title, action }: { eyebrow:string; title:string; action?:ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <p className="label-mono text-primary mb-0.5" style={{ fontSize: 10 }}>{eyebrow}</p>
        <h2 className="serif" style={{ fontSize:26, fontWeight:400, color:"var(--foreground)", lineHeight: 1 }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── FAB ────────────────────────────────────────────────────────────────────
export function FAB({ onClick, label, icon }: { onClick:()=>void; label:string; icon:ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width:40, height:40, borderRadius:12, border:"none", cursor:"pointer",
        background:"linear-gradient(135deg, oklch(0.78 0.16 58), oklch(0.68 0.14 32))",
        boxShadow:"var(--shadow-gold)",
        color:"oklch(0.10 0.01 50)", display:"flex", alignItems:"center", justifyContent:"center",
        transition:"transform .2s",
        flexShrink:0,
      }}
      onMouseOver={(e) => (e.currentTarget.style.transform="scale(1.06)")}
      onMouseOut={(e) => (e.currentTarget.style.transform="scale(1)")}
    >
      {icon}
    </button>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
        background: checked ? "var(--primary)" : "var(--border)",
        position:"relative", transition:"background .2s", flexShrink:0,
      }}
    >
      <span style={{
        position:"absolute", top:2,
        left: checked ? 22 : 2,
        width:20, height:20, borderRadius:"50%", background:"#fff",
        transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)",
      }} />
    </button>
  );
}

// ── Form elements ─────────────────────────────────────────────────────────
export function FormField({ label, error, children, required }: {
  label:string; error?:string; children:ReactNode; required?:boolean;
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:500, textTransform:"uppercase", letterSpacing:".06em", color: error ? "var(--destructive)" : "var(--muted-foreground)", fontFamily:"SF Mono,ui-monospace,monospace" }}>
          {label}{required && " *"}
        </span>
      </label>
      {children}
      {error && <p style={{ fontSize:12, color:"var(--destructive)", marginTop:4 }}>{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("nd-input", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("nd-input", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children:ReactNode }) {
  return <select className={cn("nd-input", className)} {...rest}>{children}</select>;
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }: {
  icon?:ReactNode; title:string; subtitle?:string; action?:ReactNode;
}) {
  return (
    <GlassCard className="p-8 text-center">
      {icon && <div style={{ marginBottom:12, color:"var(--muted-foreground)", display:"flex", justifyContent:"center" }}>{icon}</div>}
      <h3 className="serif" style={{ fontSize:22, fontWeight:400, fontStyle:"italic" }}>{title}</h3>
      {subtitle && <p style={{ fontSize:13, color:"var(--muted-foreground)", fontWeight:300, marginTop:6 }}>{subtitle}</p>}
      {action && <div style={{ marginTop:16 }}>{action}</div>}
    </GlassCard>
  );
}

// ── Back button ────────────────────────────────────────────────────────────
export function BackButton({ onClick }: { onClick:()=>void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:36, height:36, borderRadius:"50%", background:"var(--card)",
        border:"1px solid var(--border)", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"var(--muted-foreground)",
      }}
      aria-label="Go back"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  );
}
