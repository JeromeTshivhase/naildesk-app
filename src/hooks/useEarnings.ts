import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PaystackDeposit {
    id: string;
    reference: string;
    amount: number;           // gross amount client paid
    platformFee: number;      // 10% fee deducted
    netAmount: number;        // what tech receives
    status: "PENDING" | "PROCESSED" | "FAILED";
    appointmentId?: string;
    clientName?: string;
    serviceName?: string;
    createdAt: string;
    processedAt?: string;
}

export interface PayoutRecord {
    id: string;
    amount: number;           // net payout amount
    grossAmount: number;
    feeAmount: number;
    status: "PENDING" | "PAID" | "FAILED";
    scheduledFor?: string;
    paidAt?: string;
    depositCount: number;
    bankReference?: string;
    createdAt: string;
}

export interface EarningsBreakdown {
    grossTotal: number;
    platformFee: number;
    netTotal: number;
    feeRate: number;          // e.g. 0.10 = 10%
    depositCount: number;
    belowThreshold: boolean;  // true if net < payout minimum
    payoutThreshold: number;  // e.g. 50
    nextPayoutDate?: string;
    rolledForward?: number;   // amount rolled from previous period
    period: "WEEKLY" | "MONTHLY";
}

// ── Derived helper ─────────────────────────────────────────────────────────

/**
 * Compute breakdown from a raw totalDeposits value (legacy endpoint fallback).
 * The backend returns gross; we derive fee & net client-side.
 */
export function deriveBreakdown(
    totalDeposits: number,
    depositCount: number,
    period: "WEEKLY" | "MONTHLY",
    feeRate = 0.10,
    payoutThreshold = 50,
): EarningsBreakdown {
    const gross = totalDeposits ?? 0;
    const fee   = Math.round(gross * feeRate * 100) / 100;
    const net   = Math.round((gross - fee) * 100) / 100;
    return {
        grossTotal: gross,
        platformFee: fee,
        netTotal: net,
        feeRate,
        depositCount: depositCount ?? 0,
        belowThreshold: net > 0 && net < payoutThreshold,
        payoutThreshold,
        period,
    };
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useWeeklyBreakdown() {
    return useQuery({
        queryKey: ["earnings", "weekly"],
        queryFn: async () => {
            const { data } = await api.get("/tech/earnings/weekly");
            return deriveBreakdown(
                data.totalDeposits ?? 0,
                data.depositCount ?? 0,
                "WEEKLY",
            );
        },
        staleTime: 60_000,
    });
}

export function useMonthlyBreakdown() {
    return useQuery({
        queryKey: ["earnings", "monthly"],
        queryFn: async () => {
            const { data } = await api.get("/tech/earnings/monthly");
            return deriveBreakdown(
                data.totalDeposits ?? 0,
                data.depositCount ?? 0,
                "MONTHLY",
            );
        },
        staleTime: 60_000,
    });
}

export function usePayoutHistory() {
    return useQuery<PayoutRecord[]>({
        queryKey: ["earnings", "payouts"],
        queryFn: async () => {
            try {
                const { data } = await api.get("/tech/earnings/payouts");
                return data ?? [];
            } catch {
                return [];
            }
        },
        staleTime: 120_000,
    });
}

export function useDepositHistory() {
    return useQuery<PaystackDeposit[]>({
        queryKey: ["earnings", "deposits"],
        queryFn: async () => {
            try {
                const { data } = await api.get("/tech/earnings/deposits");
                return data ?? [];
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
    });
}