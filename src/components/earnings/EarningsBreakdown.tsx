import { useState } from "react";
import { Info, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { GlassCard, Skeleton } from "../ui";
import { fmt } from "../../lib/fmt";
import type { EarningsBreakdown } from "../../hooks/useEarnings";

// ── Commission Info Modal ──────────────────────────────────────────────────

function CommissionInfoSheet({ onClose }: { onClose: () => void }) {
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 999,
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "flex-end",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "var(--card)", borderRadius: "20px 20px 0 0",
                    padding: "24px 24px 40px", width: "100%", maxWidth: 480,
                    margin: "0 auto",
                    boxShadow: "0 -4px 40px rgba(0,0,0,0.3)",
                    animation: "slideUp .25s ease",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

                {/* Drag handle */}
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 24px" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "oklch(0.72 0.12 55 / 0.15)", border: "1px solid oklch(0.72 0.12 55 / 0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <HelpCircle size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <h3 className="serif" style={{ fontSize: 22, fontWeight: 400 }}>Platform Fee</h3>
                </div>

                <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 20 }}>
                    NailDesk charges a <strong style={{ color: "var(--foreground)" }}>10% platform fee</strong> on every
                    client deposit. This covers payment processing, WhatsApp booking automation, and platform maintenance.
                </p>

                <div style={{ background: "var(--muted)", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Client pays</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>R 500.00</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Platform fee (10%)</span>
                        <span style={{ fontSize: 13, color: "oklch(0.65 0.14 22)" }}>− R 50.00</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Your payout</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>R 450.00</span>
                    </div>
                </div>

                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                    Payouts are processed every Friday at 15:00 SAST to your registered bank account.
                    A minimum of R50 net must accumulate before a payout is triggered — anything below rolls forward.
                </p>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 24, width: "100%", height: 44, borderRadius: 12,
                        background: "var(--primary)", color: "oklch(0.10 0.01 50)",
                        border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                    }}
                >
                    Got it
                </button>
            </div>
        </div>
    );
}

// ── Below Threshold Alert ──────────────────────────────────────────────────

export function BelowThresholdAlert({
                                        net,
                                        threshold,
                                    }: {
    net: number;
    threshold: number;
}) {
    if (net <= 0 || net >= threshold) return null;
    const needed = threshold - net;
    return (
        <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "oklch(0.82 0.14 72 / 0.1)",
            border: "1px solid oklch(0.82 0.14 72 / 0.3)",
            borderRadius: 12, padding: "12px 14px",
        }}>
            <Info size={16} style={{ color: "oklch(0.72 0.14 58)", marginTop: 1, flexShrink: 0 }} />
            <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.65 0.10 55)", marginBottom: 2 }}>
                    Below payout threshold
                </p>
                <p style={{ fontSize: 12, color: "oklch(0.65 0.10 55)", lineHeight: 1.5 }}>
                    You need {fmt.currency(needed)} more before a payout is triggered (min {fmt.currency(threshold)}).
                    This amount will roll forward to next week.
                </p>
            </div>
        </div>
    );
}

// ── Main Breakdown Card ────────────────────────────────────────────────────

interface Props {
    breakdown: EarningsBreakdown;
    loading?: boolean;
    label?: string;
}

export function EarningsBreakdownCard({ breakdown, loading, label = "This week" }: Props) {
    const [showInfo, setShowInfo] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const { grossTotal, platformFee, netTotal, feeRate, depositCount } = breakdown;
    const hasEarnings = grossTotal > 0;

    return (
        <>
            {showInfo && <CommissionInfoSheet onClose={() => setShowInfo(false)} />}

            <GlassCard style={{
                padding: 0, overflow: "hidden",
                boxShadow: hasEarnings
                    ? "0 0 0 1px oklch(0.72 0.12 55 / 0.25), 0 4px 32px oklch(0.72 0.12 55 / 0.10)"
                    : undefined,
            }}>
                {/* Header */}
                <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <p className="label-mono" style={{ color: "var(--muted-foreground)", fontSize: 10 }}>{label}</p>
                        <button
                            onClick={() => setShowInfo(true)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                            title="About the platform fee"
                        >
                            <HelpCircle size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <Skeleton style={{ height: 36, width: "55%", marginBottom: 6 }} />
                    ) : (
                        <p className="serif" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1, color: "var(--primary)", marginBottom: 4 }}>
                            {fmt.currency(netTotal)}
                        </p>
                    )}

                    <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        Your payout
                        {depositCount > 0 && ` · ${depositCount} deposit${depositCount !== 1 ? "s" : ""}`}
                    </p>
                </div>

                {/* Breakdown rows */}
                {!loading && hasEarnings && (
                    <>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            style={{
                                width: "100%", background: "none", border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "10px 16px", color: "var(--muted-foreground)",
                            }}
                        >
              <span style={{ fontSize: 11, fontFamily: "SF Mono,ui-monospace,monospace", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Fee breakdown
              </span>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {expanded && (
                            <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                                <Row label="Gross (client paid)" value={grossTotal} />
                                <Row
                                    label={`Platform fee (${Math.round(feeRate * 100)}%)`}
                                    value={-platformFee}
                                    negative
                                />
                                <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                                <Row label="Your payout" value={netTotal} bold />
                            </div>
                        )}
                    </>
                )}

                {!loading && !hasEarnings && (
                    <div style={{ padding: "14px 16px", textAlign: "center" }}>
                        <p style={{ fontSize: 13, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                            No deposits yet {label === "This week" ? "this week" : "this month"}
                        </p>
                    </div>
                )}
            </GlassCard>
        </>
    );
}

function Row({
                 label,
                 value,
                 negative,
                 bold,
             }: {
    label: string;
    value: number;
    negative?: boolean;
    bold?: boolean;
}) {
    const color = negative
        ? "oklch(0.65 0.14 22)"
        : bold
            ? "var(--foreground)"
            : "var(--muted-foreground)";

    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{
          fontSize: 13,
          color: bold ? "var(--foreground)" : "var(--muted-foreground)",
          fontWeight: bold ? 600 : 400,
      }}>
        {label}
      </span>
            <span style={{
                fontSize: bold ? 16 : 14,
                fontWeight: bold ? 600 : 500,
                color,
                fontFamily: "Cormorant Garamond, serif",
            }}>
        {negative ? "− " : ""}{fmt.currency(Math.abs(value))}
      </span>
        </div>
    );
}