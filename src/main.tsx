import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import {
  hideSplash,
  initAppListeners,
  initNetworkListener,
  initStatusBar,
} from "./lib/capacitor";
import { getInitialThemeMode, resolveTheme } from "./lib/theme";

// Import push test utilities (available in console as window.pushTests)
import "./lib/pushTestUtils";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Boot native plugins
const isDark = resolveTheme(getInitialThemeMode()) === "dark";
initStatusBar(isDark);
initAppListeners();
initNetworkListener((online) => {
  document.dispatchEvent(new CustomEvent("naildesk:network", { detail: { online } }));
});

// Hide splash immediately — don't wait for React
hideSplash();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  </StrictMode>
);

// Hide again after first paint as a safety net
requestAnimationFrame(() => hideSplash());
