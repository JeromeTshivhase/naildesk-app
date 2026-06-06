import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "../lib/theme";

const MODES: Array<{ mode: ThemeMode; Icon: typeof Sun; label: string }> = [
  { mode: "light",  Icon: Sun,     label: "Light mode"  },
  { mode: "dark",   Icon: Moon,    label: "Dark mode"   },
  { mode: "system", Icon: Monitor, label: "System theme" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Color mode"
      style={{
        position:"fixed", top:16, zIndex:50,
        right:`calc(3.5rem + env(safe-area-inset-right, 0px))`,
        display:"flex", alignItems:"center",
        height:44, borderRadius:99,
        background:"var(--card)",
        border:"1px solid var(--border)",
        padding:"0 4px",
        boxShadow:"2px 3px 0 0 color-mix(in oklab, var(--foreground) 18%, transparent)",
      }}
    >
      {MODES.map(({ mode, Icon, label }) => {
        const selected = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(mode)}
            style={{
              width:36, height:36, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"none", cursor:"pointer", transition:"all .15s",
              background: selected ? "var(--primary)" : "transparent",
              color: selected ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}
          >
            <Icon size={16} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
