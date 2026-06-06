import axios from "axios";
import { create } from "zustand";
import { api } from "./api";
import { Capacitor } from "@capacitor/core";

export interface AuthUser {
  id?: string;
  fullName?: string;
  businessName?: string;
  isMobile?: boolean;
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  authStatus: "loading" | "authenticated" | "unauthenticated";
  loginSuccess: (u: AuthUser, tokens?: { accessToken?: string; refreshToken?: string }) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

const PROFILE_KEY = "naildesk.profile";
const TOKEN_KEY   = "naildesk.token";
const REFRESH_KEY = "naildesk.refresh";

export function saveProfile(u: AuthUser | null): void {
  try {
    if (!u) {
      localStorage.removeItem(PROFILE_KEY);
      console.log("[Auth] Cleared profile from storage");
    } else {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(u));
      console.log("[Auth] Saved profile to storage:", u.id);
    }
  } catch (e) {
    console.error("[Auth] Error saving profile:", e);
  }
}

export function loadProfile(): AuthUser | null {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    console.log("[Auth] Loaded profile from storage:", data?.id ?? "null");
    return data as AuthUser | null;
  } catch (e) {
    console.error("[Auth] Error loading profile:", e);
    return null;
  }
}

export function saveTokens(access?: string, refresh?: string): void {
  try {
    if (access) {
      localStorage.setItem(TOKEN_KEY, access);
      console.log("[Auth] Saved access token to storage");
    }
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
      console.log("[Auth] Saved refresh token to storage");
    }
  } catch (e) {
    console.error("[Auth] Error saving tokens:", e);
  }
}

export function loadToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log("[Auth] Loaded access token from storage:", token ? `${token.substring(0, 20)}...` : "null");
    return token;
  } catch (e) {
    console.error("[Auth] Error loading token:", e);
    return null;
  }
}

export function loadRefreshToken(): string | null {
  try {
    const token = localStorage.getItem(REFRESH_KEY);
    console.log("[Auth] Loaded refresh token from storage:", token ? `${token.substring(0, 20)}...` : "null");
    return token;
  } catch (e) {
    console.error("[Auth] Error loading refresh token:", e);
    return null;
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    console.log("[Auth] Cleared tokens from storage");
  } catch (e) {
    console.error("[Auth] Error clearing tokens:", e);
  }
}

// Inject Bearer token on every request when running natively
const isNative = Capacitor.isNativePlatform();
console.log("[Auth] App running on:", isNative ? "NATIVE (Android/iOS)" : "WEB");

api.interceptors.request.use((config) => {
  if (isNative) {
    const token = loadToken();
    if (token) {
      console.log("[Auth] Adding Bearer token to request:", config.url);
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

export const useAuth = create<AuthState>((set, get) => {
  let hydrationPromise: Promise<void> | null = null;

  return {
    user: null,
    authStatus: "loading",

    loginSuccess: (user, tokens) => {
      console.log("[Auth] loginSuccess called with user:", user.id, "tokens:", !!tokens?.accessToken);
      saveProfile(user);
      if (tokens?.accessToken || tokens?.refreshToken) {
        console.log("[Auth] Saving tokens, hasAccess:", !!tokens?.accessToken, "hasRefresh:", !!tokens?.refreshToken);
        saveTokens(tokens.accessToken, tokens.refreshToken);
      }
      console.log("[Auth] Setting state: authenticated");
      set({ user, authStatus: "authenticated" });
    },

    logout: () => {
      console.log("[Auth] logout called");
      saveProfile(null);
      clearTokens();
      api.post("/auth/logout").catch(() => {
        /* Ignore logout errors */
      });
      set({ user: null, authStatus: "unauthenticated" });
    },

    hydrate: async () => {
      const state = get();
      console.log("[Auth] Hydrate called, authStatus:", state.authStatus);

      // Prevent concurrent hydrations
      if (hydrationPromise) {
        console.log("[Auth] Hydration already in progress, waiting...");
        return hydrationPromise;
      }

      // Skip if already authenticated
      if (state.authStatus === "authenticated") {
        console.log("[Auth] Already authenticated, skipping hydration");
        return;
      }

      hydrationPromise = performHydration();
      try {
        await hydrationPromise;
      } finally {
        hydrationPromise = null;
      }
    },
  };

  async function performHydration(): Promise<void> {
    const cached = loadProfile();
    const token = loadToken();

    console.log("[Auth] Hydrate state: isNative=", isNative, "cached.id=", cached?.id, "hasToken=", !!token);

    // On native: if we have a cached user + token, trust it for immediate UI render
    // but silently check if the token is expired and refresh in the background.
    if (isNative && cached?.id && token) {
      console.log("[Auth] Using native auth path - rendering with cached data immediately");
      set({ user: cached, authStatus: "authenticated" });

      // Background: check if JWT is expired and proactively refresh
      try {
        await refreshTokenIfExpired(token);
      } catch (e) {
        console.warn("[Auth] Silent background refresh failed:", e);
      }

      return;
    }

    // Web: standard cookie-based flow - with retry logic
    console.log("[Auth] Using web auth path (or native without cached token)");
    if (cached?.id) {
      console.log("[Auth] Have cached user, keeping it");
      set({ user: cached, authStatus: "loading" });
    }

    try {
      console.log("[Auth] Calling /auth/me to verify session");
      const { data } = await api.get<Partial<AuthUser>>("/auth/me");
      const user: AuthUser = {
        id:           data.id,
        fullName:     data.fullName,
        businessName: data.businessName,
        isMobile:     data.isMobile,
        phone:        data.phone,
      };
      console.log("[Auth] /auth/me succeeded, setting authenticated");
      saveProfile(user);
      set({ user, authStatus: "authenticated" });
    } catch (e) {
      const errMsg = (e as any)?.message ?? String(e);
      const status = (e as any)?.response?.status;
      console.warn("[Auth] Hydration failed (status:", status, "):", errMsg);

      // On 401, clear auth
      if (status === 401) {
        console.log("[Auth] Got 401, clearing auth");
        saveProfile(null);
        clearTokens();
        set({ user: null, authStatus: "unauthenticated" });
      } else {
        // On other errors, keep cached user if available (network error, server error)
        console.log("[Auth] Non-401 error, keeping cached user if available");
        if (cached?.id) {
          console.log("[Auth] Keeping cached user despite error");
          set({ user: cached, authStatus: "authenticated" });
        } else {
          console.log("[Auth] No cached user, logging out");
          saveProfile(null);
          clearTokens();
          set({ user: null, authStatus: "unauthenticated" });
        }
      }
    }
  }

  async function refreshTokenIfExpired(token: string): Promise<void> {
    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        console.warn("[Auth] Invalid token format");
        return;
      }

      // Safely decode JWT payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
      const exp: number = payload.exp ?? 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresInSeconds = exp - nowSeconds;

      if (expiresInSeconds < 60) {
        // Expired or expiring within 60 seconds — refresh silently
        console.log("[Auth] Native token expired/expiring, attempting silent refresh");
        const rt = loadRefreshToken();
        const { API_BASE } = await import("./api");
        if (rt) {
          const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
              `${API_BASE}/auth/refresh`,
              {},
              { headers: { Authorization: `Bearer ${rt}` } }
          );
          saveTokens(data.accessToken, data.refreshToken);
          console.log("[Auth] Silent token refresh succeeded");
        }
      } else {
        console.log("[Auth] Native token still valid for", expiresInSeconds, "seconds");
      }
    } catch (e) {
      // Refresh failed — let the per-request interceptor handle 401s
      console.warn("[Auth] Background refresh failed:", e);
    }
  }
});