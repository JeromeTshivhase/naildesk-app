import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import { Capacitor } from "@capacitor/core";

const PROD_API = "https://naildesk-api-stagin.up.railway.app/api/v1";
const PROD_WS  = "https://naildesk-api-stagin.up.railway.app/ws";

export const isNative = Capacitor.isNativePlatform();

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? (isNative ? PROD_API : "/api/v1")) as string;
export const WS_URL   = (import.meta.env.VITE_WS_URL ?? PROD_WS) as string;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
  // Only send cookies on web; on native we use Bearer tokens
  withCredentials: !isNative,
});

let isRefreshing = false;
let waiters: Array<(ok: boolean) => void> = [];

// Error handling with proper type guards
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

class ApiError extends Error {
  constructor(
      public status: number | undefined,
      public originalError: unknown,
      message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const status = error?.response?.status;
      const cfg = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const url = (cfg?.url ?? "") as string;

      if (status === 401 && cfg && !cfg._retry && !/\/auth\//.test(url)) {
        cfg._retry = true;

        if (isRefreshing) {
          return new Promise((res, rej) =>
              waiters.push((ok) => (ok ? res(api(cfg)) : rej(error)))
          );
        }

        isRefreshing = true;
        let ok = false;

        try {
          if (isNative) {
            // On native, send refresh token as Bearer in body / header
            const { loadRefreshToken, saveTokens } = await import("./auth");
            const rt = loadRefreshToken();
            if (rt) {
              const { data } = await axios.post<RefreshResponse>(
                  `${API_BASE}/auth/refresh`,
                  {},
                  { headers: { Authorization: `Bearer ${rt}` } }
              );
              if (data?.accessToken && data?.refreshToken) {
                saveTokens(data.accessToken, data.refreshToken);
                // Update the Authorization header for the retried request
                cfg.headers = cfg.headers ?? {};
                cfg.headers["Authorization"] = `Bearer ${data.accessToken}`;
                ok = true;
              }
            }
          } else {
            await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
            ok = true;
          }
        } catch (refreshError) {
          console.error("[API] Token refresh failed:", refreshError);
        }

        isRefreshing = false;
        waiters.forEach((fn) => fn(ok));
        waiters = [];

        if (ok) return api(cfg);

        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          try {
            const { useAuth } = await import("./auth");
            useAuth.getState().logout();
          } catch (e) {
            console.error("[API] Failed to logout:", e);
          }
        }
      }
      return Promise.reject(error);
    }
);

// ── Types ──────────────────────────────────────────────────────────────────
export type AppointmentStatus = "AWAITING_DEPOSIT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type DepositStatus      = "UNPAID" | "PAID" | "REFUNDED";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";
export type SubscriptionTier   = "FREE" | "GROW" | "PRO";

export interface Appointment {
  id: string;
  startTime: string;
  endTime?: string;
  status: AppointmentStatus;
  notes?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  serviceName?: string;
  depositRequired?: number;
  depositPaid?: number;
  depositStatus?: DepositStatus;
  cancelReason?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  client?: { id: string; fullName: string; phone?: string };
  service?: { id: string; name: string; durationMinutes: number; price: number };
  price?: number;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  allergies?: string;
  preferences?: string;
  notes?: string;
  address?: string;
  lastVisitDate?: string;
  totalVisits?: number;
  totalAppointments?: number;
  createdAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  price: number;
  productCost?: number;
  requiresDeposit?: boolean;
  isActive?: boolean;
  imageUrl?: string;
}

export interface Profile {
  id?: string;
  phone?: string;
  fullName: string;
  businessName: string;
  mobile?: boolean;
  address?: string;
  salonAddress?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  branchCode?: string;
  accountType?: string;
  hasBankingDetails?: boolean;
  subscriptionStatus?: SubscriptionStatus | string;
  tier?: SubscriptionTier | string;
  subscriptionExpiresAt?: string;
}

export interface Subscription {
  tier?: SubscriptionTier | string;
  status?: SubscriptionStatus | string;
  active?: boolean;
  trialEndsAt?: string;
  trialDaysRemaining?: number;
  planName?: string;
  nextBillingDate?: string;
  expiresAt?: string;
  depositCollection?: boolean;
}

export interface DashboardData {
  todayAppointments?: Appointment[];
  subscription?: Subscription;
  stats?: { todayRevenue?: number; pendingDeposits?: number; weeklyTotal?: number };
  [k: string]: unknown;
}

export interface DailyEarningsLog {
  id: string;
  logDate: string;
  totalDeposits?: number;
  notes?: string;
  createdAt?: string;
}

export interface EarningsSummary {
  period?: string;
  startDate?: string;
  endDate?: string;
  totalDeposits?: number;
  depositCount?: number;
}

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  caption?: string;
  serviceType?: string;
  createdAt?: string;
}

export interface AvailabilityWindow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  active?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  monthlyBookingLimit: number | string; // Can be "Unlimited"
  serviceLimit: number | string;
  portfolioImageLimit: number | string;
  depositCollection: boolean;
  waitlist: boolean;
  analytics: boolean;
  whatsAppBot: boolean;
  features: string[];
}

// Helper to check if a limit is unlimited
export function isUnlimited(value: unknown): boolean {
  return value === "Unlimited" || value === "UNLIMITED";
}

// Helper to format limit for display
export function formatLimit(value: unknown): string {
  if (isUnlimited(value)) return "Unlimited";
  if (typeof value === "number") return String(value);
  return String(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload helpers
// ─────────────────────────────────────────────────────────────────────────────
export interface UploadResponse {
  publicId: string;
  secureUrl: string;
}

/** Upload an image file to Cloudinary via the NailDesk API proxy. */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResponse>("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}