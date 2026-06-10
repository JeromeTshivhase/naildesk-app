import { CheckCircle2, Clock, XCircle, Landmark } from "lucide-react";
import { GlassCard, Skeleton } from "../ui";
import { fmt } from "../../lib/fmt";
import type { PayoutRecord } from "../../hooks/useEarnings";

function PayoutStatusIcon({ status }: { status: PayoutRecord["status"] }) {
    if (status === "PAID")    return <CheckCircle2 size={16} style={{ color: "oklch(0.65 0.12 155)" }} />;
    if (status === "FAILED")  return <XCircle size={16} style={{ color: "oklch(0.65 0.14 22)" }} />;
    return <Clock size={16} style={{ color: "oklch(0.72 0.12 55)" }} />;
}

function payoutStatusLabel(status: PayoutRecord["status"]) {
    return { PAID: "Paid", PENDING: "Scheduled", FAILED: "Failed" }[status] ?? status;
}

function payoutStatusColor(status: PayoutRecord["status"]) {
    return {
        PAID:    "oklch(0.65 0.12 155)",
        PENDING: "oklch(0.72 0.12 55)",
        FAILED:  "oklch(0.65 0.14 22)",
    }[status] ?? "var(--muted-foreground)";
}

interface Props {
    payouts: PayoutRecord[];
    loading?: boolean;
}

export function PayoutHistory({ payouts, loading }: Props) {
    if (loading) return <Skeleton style={{ height: 120 }} />;
    if (!payouts.length) return (
        <GlassCard style={{ padding: "28px 20px", textAlign: "center" }}>
            <Landmark size={28} style={{ color: "var(--muted-foreground)", margin: "0 auto 10px", display: "block" }} />
            <p className="serif" style={{ fontSize: 18, fontStyle: "italic", fontWeight: 400, color: "var(--muted-foreground)" }}>
                No payouts yet
            </p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                Payouts process every Friday at 15:00 SAST once you hit R50 net.
            </p>
        </GlassCard>
    );

    return (
        <GlassCard style={{ overflow: "hidden", padding: 0 }}>
            {payouts.map((p, i) => (
                <div key={p.id} style={{
                    padding: "14px 16px",
                    borderBottom: i < payouts.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", flexDirection: "column", gap: 6,
                }}>
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <PayoutStatusIcon status={p.status} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                {p.paidAt
                    ? fmt.date(p.paidAt, { day: "numeric", month: "short", year: "numeric" })
                    : p.scheduledFor
                        ? fmt.date(p.scheduledFor, { day: "numeric", month: "short" })
                        : "—"}
              </span>
                            <span style={{
                                fontSize: 10, fontFamily: "SF Mono,ui-monospace,monospace",
                                textTransform: "uppercase", letterSpacing: ".05em",
                                color: payoutStatusColor(p.status),
                                background: `${payoutStatusColor(p.status)}18`,
                                borderRadius: 6, padding: "2px 7px",
                            }}>
                {payoutStatusLabel(p.status)}
              </span>
                        </div>
                        <span className="serif" style={{ fontSize: 20, fontWeight: 500, color: "var(--primary)" }}>
              {fmt.currency(p.amount)}
            </span>
                    </div>

                    {/* Breakdown sub-row */}
                    <div style={{ display: "flex", gap: 16, paddingLeft: 22 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              Gross {fmt.currency(p.grossAmount)}
            </span>
                        <span style={{ fontSize: 11, color: "oklch(0.65 0.14 22)" }}>
              Fee −{fmt.currency(p.feeAmount)}
            </span>
                        {p.depositCount > 0 && (
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {p.depositCount} deposit{p.depositCount !== 1 ? "s" : ""}
              </span>
                        )}
                    </div>

                    {p.bankReference && (
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", paddingLeft: 22, fontFamily: "SF Mono,ui-monospace,monospace" }}>
                            Ref: {p.bankReference}
                        </p>
                    )}
                </div>
            ))}
        </GlassCard>
    );
}