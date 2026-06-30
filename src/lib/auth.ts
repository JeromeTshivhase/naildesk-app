import axios from "axios";
import { create } from "zustand";
import { api } from "./api";
import { Capacitor } from "@capacitor/core";

// Dev-only logger — all calls are no-ops in production builds.
// Vite's tree-shaker eliminates the dead branch at build time.
const log = import.meta.env.DEV
  ? (...args: unknown[]) => console.log("[Auth]", ...args)
  : () => {};

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

const PROFILE_KEY       = "naildesk.profile";
const HAS_REGISTERED_KEY = "naildesk.hasRegistered";

/** Written once after first registration — never cleared on logout. */
export function markHasRegistered(): void {
  // Clear setup guide dismiss so new users always see it
  try { localStorage.removeItem("naildesk.setup-guide-seen"); } catch {}
  try { localStorage.setItem(HAS_REGISTERED_KEY, "1"); } catch {}
}

export function hasRegistered(): boolean {
  try { return localStorage.getItem(HAS_REGISTERED_KEY) === "1"; } catch { return false; }
}
const TOKEN_KEY   = "naildesk.token";
const REFRESH_KEY = "naildesk.refresh";

export function saveProfile(u: AuthUser | null): void {
  try {
    if (!u) {
      localStorage.removeItem(PROFILE_KEY);
      log("Cleared profile from storage");
    } else {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(u));
      log("Saved profile to storage:", u.id);
    }
  } catch (e) {
    console.error("[Auth] Error saving profile:", e);
  }
}

export function loadProfile(): AuthUser | null {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    log("Loaded profile from storage:", data?.id ?? "null");
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
      log("Saved access token to storage");
    }
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
      log("Saved refresh token to storage");
    }
  } catch (e) {
    console.error("[Auth] Error saving tokens:", e);
  }
}

export function loadToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    log("Loaded access token from storage:", token ? `${token.substring(0, 20)}...` : "null");
    return token;
  } catch (e) {
    console.error("[Auth] Error loading token:", e);
    return null;
  }
}

export function loadRefreshToken(): string | null {
  try {
    const token = localStorage.getItem(REFRESH_KEY);
    log("Loaded refresh token from storage:", token ? `${token.substring(0, 20)}...` : "null");
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
    log("Cleared tokens from storage");
  } catch (e) {
    console.error("[Auth] Error clearing tokens:", e);
  }
}

// Inject Bearer token on every request
// - On native: Always use Bearer token (primary auth method)
// - On web: Use Bearer token if available (fallback to cookies)
const isNative = Capacitor.isNativePlatform();
log("App running on:", isNative ? "NATIVE (Android/iOS)" : "WEB");

api.interceptors.request.use((config) => {
  const token = loadToken();

  if (token) {
    // We have a valid token - use it
    log("Adding Bearer token to request:", config.url);
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  } else if (isNative) {
    // Native app but no token - log it (should be in hydration state)
    log("Native app but no token available for:", config.url);
  }
  // On web with no token, rely on cookies (withCredentials: true in api.ts)

  return config;
});

export const useAuth = create<AuthState>((set, get) => {
  let hydrationPromise: Promise<void> | null = null;

  return {
    user: null,
    authStatus: "loading",

    loginSuccess: (user, tokens) => {
      log("loginSuccess called with user:", user.id, "tokens:", !!tokens?.accessToken);
      saveProfile(user);
      if (tokens?.accessToken || tokens?.refreshToken) {
        log("Saving tokens, hasAccess:", !!tokens?.accessToken, "hasRefresh:", !!tokens?.refreshToken);
        saveTokens(tokens.accessToken, tokens.refreshToken);
      }
      markHasRegistered();
      log("Setting state: authenticated");
      set({ user, authStatus: "authenticated" });
    },

    logout: () => {
      log("logout called");
      saveProfile(null);
      clearTokens();
      api.post("/auth/logout").catch(() => {
        /* Ignore logout errors */
      });
      set({ user: null, authStatus: "unauthenticated" });
    },

    hydrate: async () => {
      const state = get();
      log("Hydrate called, authStatus:", state.authStatus);

      // Prevent concurrent hydrations
      if (hydrationPromise) {
        log("Hydration already in progress, waiting...");
        return hydrationPromise;
      }

      // Skip if already authenticated
      if (state.authStatus === "authenticated") {
        log("Already authenticated, skipping hydration");
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

    log("Hydrate state: isNative=", isNative, "cached.id=", cached?.id, "hasToken=", !!token);

    // On native: if we have a cached user + token, we need to validate it first
    if (isNative && cached?.id && token) {
      log("Using native auth path - validating cached token before marking authenticated");

      // Check if token is already expired
      const isTokenExpired = await checkTokenExpiration(token);

      if (isTokenExpired) {
        log("Cached token is expired, attempting to refresh...");
        try {
          const refreshed = await refreshToken();
          if (refreshed) {
            log("Token refresh succeeded, marking authenticated");
            set({ user: cached, authStatus: "authenticated" });
            return;
          } else {
            console.warn("[Auth] Token refresh failed, clearing auth");
            saveProfile(null);
            clearTokens();
            set({ user: null, authStatus: "unauthenticated" });
            return;
          }
        } catch (e) {
          console.error("[Auth] Error during token refresh:", e);
          saveProfile(null);
          clearTokens();
          set({ user: null, authStatus: "unauthenticated" });
          return;
        }
      } else {
        log("Cached token is still valid, rendering immediately");
        set({ user: cached, authStatus: "authenticated" });
        return;
      }
    }

    // Web: standard cookie-based flow - with retry logic
    log("Using web auth path (or native without cached token)");
    if (cached?.id) {
      log("Have cached user, keeping it");
      set({ user: cached, authStatus: "loading" });
    }

    try {
      log("Calling /auth/me to verify session");
      const { data } = await api.get<Partial<AuthUser>>("/auth/me");
      const user: AuthUser = {
        id:           data.id,
        fullName:     data.fullName,
        businessName: data.businessName,
        isMobile:     (data as any).mobile ?? data.isMobile,
        phone:        data.phone,
      };
      log("/auth/me succeeded, setting authenticated");
      saveProfile(user);
      set({ user, authStatus: "authenticated" });
    } catch (e) {
      const errMsg = (e as any)?.message ?? String(e);
      const status = (e as any)?.response?.status;
      console.warn("[Auth] Hydration failed (status:", status, "):", errMsg);

      // On 401 or 403, clear auth (real auth failure)
      if (status === 401 || status === 403) {
        log("Got", status, ", clearing auth (session expired or invalid)");
        saveProfile(null);
        clearTokens();
        set({ user: null, authStatus: "unauthenticated" });
      } else {
        // On other errors (5xx, network), keep cached user if available (server issue, not auth)
        log("Non-auth error (status", status, "), checking if we can keep cached user");
        if (cached?.id) {
          log("Keeping cached user despite error - likely temporary server issue");
          set({ user: cached, authStatus: "authenticated" });
        } else {
          log("No cached user, logging out");
          saveProfile(null);
          clearTokens();
          set({ user: null, authStatus: "unauthenticated" });
        }
      }
    }
  }

  async function checkTokenExpiration(token: string): Promise<boolean> {
    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        console.warn("[Auth] Invalid token format, treating as expired");
        return true;
      }

      // Safely decode JWT payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
      const exp: number = payload.exp ?? 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresInSeconds = exp - nowSeconds;

      if (expiresInSeconds < 60) {
        log("Token expired or expiring within 60 seconds");
        return true;
      } else {
        log("Token valid for", expiresInSeconds, "more seconds");
        return false;
      }
    } catch (e) {
      console.error("[Auth] Error checking token expiration:", e);
      return true; // Treat errors as expired to be safe
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const rt = loadRefreshToken();
      if (!rt) {
        console.warn("[Auth] No refresh token available");
        return false;
      }

      log("Attempting to refresh token with refresh token");
      const { API_BASE } = await import("./api");
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${API_BASE}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${rt}` } }
      );

      if (data?.accessToken && data?.refreshToken) {
        saveTokens(data.accessToken, data.refreshToken);
        log("Token refresh succeeded");
        return true;
      } else {
        console.warn("[Auth] Refresh response missing tokens");
        return false;
      }
    } catch (e) {
      const status = (e as any)?.response?.status;
      const errMsg = (e as any)?.message ?? String(e);
      console.error("[Auth] Token refresh failed (status:", status, "):", errMsg);

      // Clear tokens on any refresh error (network, server, auth)
      clearTokens();
      return false;
    }
  }

});