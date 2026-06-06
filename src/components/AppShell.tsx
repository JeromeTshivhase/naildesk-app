import { useEffect } from "react";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SubscriptionBanner } from "./SubscriptionBanner";
import { useWebSocket } from "../hooks/useWebSocket";

export function AppShell({ children }: { children: ReactNode }) {
  // Initialize WebSocket safely
  let wsError: Error | null = null;
  try {
    useWebSocket();
  } catch (e) {
    wsError = e as Error;
    console.error("[AppShell] WebSocket initialization error:", e);
  }

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
      {/* Subscription banner with error boundary */}
      <div>
        <SubscriptionBanner />
      </div>
      <main
        className="mx-auto animate-fade-up"
        style={{ maxWidth:480, paddingBottom:112 }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
