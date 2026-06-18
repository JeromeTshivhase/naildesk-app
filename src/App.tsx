import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { Loader2 } from "lucide-react";
import { initPushNotifications, initStatusBar } from "./lib/capacitor";
import { useNotifications } from "./stores/notifications";
import { getInitialThemeMode, resolveTheme } from "./lib/theme";

import PaymentPage          from "./pages/PaymentPage";
import PaymentSuccessPage   from "./pages/PaymentSuccess";
import PaymentFailedPage    from "./pages/PaymentFailed";
import PaymentCancelledPage from "./pages/PaymentCancelled";
import LoginPage    from "./pages/Login";
import RegisterPage from "./pages/Register";
import HomePage     from "./pages/Home";
import EarningsPage from "./pages/Earnings";

import {
  AppointmentsPage,
  AppointmentDetailPage,
  NewAppointmentPage,
} from "./pages/Appointments";

import {
  ClientsPage,
  ClientDetailPage,
  NewClientPage,
} from "./pages/Clients";

import {
  SettingsPage,
  ProfileEditPage,
  BankingPage,
  AvailabilityPage,
  SubscriptionPage,
  EmergencyPage,
} from "./pages/Settings";

// ── Splash ────────────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
      <div style={{
        minHeight:"100dvh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"var(--background)",
      }}>
        <div className="animate-fade-in" style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
          {/* Combined logo (includes mark + wordmark text) */}
          <img
              src="/brand/naildesk-logo.png"
              alt="NailDesk"
              width={280} height={180}
              style={{ objectFit:"contain", display:"block" }}
              onError={(e) => {
                e.currentTarget.style.display="none";
                const h = document.createElement("h1");
                h.className = "serif";
                h.style.cssText = "font-size:36px;font-weight:400;line-height:1;";
                h.innerHTML = `Nail<span style="color:var(--primary);font-style:italic">Desk</span>`;
                e.currentTarget.parentElement?.appendChild(h);
              }}
          />
        </div>
        <Loader2
            size={18}
            style={{ color:"var(--muted-foreground)", marginTop:40, animation:"spinAnim .7s linear infinite" }}
        />
        <style>{`@keyframes spinAnim { to { transform: rotate(360deg); } }`}</style>
      </div>
  );
}

// ── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth() {
  const { authStatus } = useAuth();
  if (authStatus === "loading")         return <SplashScreen />;
  if (authStatus === "unauthenticated") return <Navigate to="/login" replace />;
  return (
      <AppShell>
        <Outlet />
      </AppShell>
  );
}

function RedirectIfAuth() {
  const { authStatus } = useAuth();
  if (authStatus === "loading") return <SplashScreen />;
  if (authStatus === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}


export default function App() {
  const hydrate    = useAuth((s) => s.hydrate);
  const authStatus = useAuth((s) => s.authStatus);
  const addNotif   = useNotifications((s) => s.add);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await hydrate();
      } catch (e) {
        if (!cancelled) console.error("[App] Error during hydration:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync native status bar when theme changes
  useEffect(() => {
    try {
      const observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains("dark");
        initStatusBar(isDark).catch((e) => {
          console.error("[App] Error updating status bar:", e);
        });
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    } catch (e) {
      console.error("[App] Error setting up theme observer:", e);
    }
  }, []);

  // Step 2 — init the full push stack after the app has stabilised.
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const timer = setTimeout(() => {
      try {
        Promise.resolve(
            initPushNotifications((payload) => {
              try {
                addNotif({
                  type: payload.type as any,
                  message: payload.message,
                  appointmentId: payload.appointmentId,
                  clientName: payload.clientName,
                });
              } catch (e) {
                console.error("[App] Error handling push notification:", e);
              }
            })
        ).catch((e) => {
          console.error("[App] Error initializing push notifications:", e);
        });
      } catch (e) {
        console.error("[App] Error in push notification setup:", e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [authStatus, addNotif]);

  return (
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/"     element={<HomePage />} />

            {/* Appointments */}
            <Route path="/appointments"          element={<AppointmentsPage />} />
            <Route path="/appointments/new"      element={<NewAppointmentPage />} />
            <Route path="/appointments/:id"      element={<AppointmentDetailPage />} />

            {/* Clients */}
            <Route path="/clients"               element={<ClientsPage />} />
            <Route path="/clients/new"           element={<NewClientPage />} />
            <Route path="/clients/:id"           element={<ClientDetailPage />} />

            {/* Earnings */}
            <Route path="/earnings"              element={<EarningsPage />} />

            {/* Settings */}
            <Route path="/settings"              element={<SettingsPage />} />
            <Route path="/settings/profile"      element={<ProfileEditPage />} />
            <Route path="/settings/banking"      element={<BankingPage />} />
            <Route path="/settings/availability" element={<AvailabilityPage />} />
            <Route path="/settings/subscription" element={<SubscriptionPage />} />
            <Route path="/settings/emergency"    element={<EmergencyPage />} />
          </Route>

          {/* Public client-facing payment pages — no auth required */}
          <Route path="/pay/:slug"          element={<PaymentPage />} />
          <Route path="/payment-success"    element={<PaymentSuccessPage />} />
          <Route path="/payment-failed"     element={<PaymentFailedPage />} />
          <Route path="/payment-cancelled"  element={<PaymentCancelledPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
  );
}