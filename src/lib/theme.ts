import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const KEY = "naildesk.theme";

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const s = localStorage.getItem(KEY) as ThemeMode | null;
  if (s === "light" || s === "dark" || s === "system") return s;
  return "system";
}

export function resolveTheme(m: ThemeMode): ResolvedTheme {
  return m === "system" ? systemTheme() : m;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#1f1815" : "#fff5f9");
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialThemeMode());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => { if (theme === "system") applyTheme("system"); };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    applyTheme(t);
    try { localStorage.setItem(KEY, t); } catch {}
  };

  return { theme, resolvedTheme: resolveTheme(theme), setTheme };
}
