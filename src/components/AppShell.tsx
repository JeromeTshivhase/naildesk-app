import { useEffect } from "react";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { NotificationBell } from "./NotificationBell";
import { useWebSocket } from "../hooks/useWebSocket";

export function AppShell({ children }: { children: ReactNode }) {
  // Hook must be called unconditionally at the top level (Rules of Hooks).
  // The hook itself handles all internal errors — no try/catch wrapper needed.
  useWebSocket();

  // Catch any unhandled errors in AppShell to prevent app crashes
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[AppShell] Unhandled error:", event.error);
      // Don't crash the app - just log the error
      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[AppShell] Unhandled promise rejection:", event.reason);
      // Don't crash the app - just log the error
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <div className="bg-app relative">
      <SubscriptionBanner />
      <NotificationBell />
      <main
        className="mx-auto animate-fade-up"
        style={{ maxWidth:480, paddingBottom:"calc(100px + env(safe-area-inset-bottom, 16px))" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
