export const fmt = {
  currency: (n: number | string | null | undefined) => {
    const num = Number(n ?? 0);
    return new Intl.NumberFormat("en-ZA", {
      style: "currency", currency: "ZAR",
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(Number.isFinite(num) ? num : 0);
  },

  date: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-ZA", opts ?? {
      day: "numeric", month: "short", year: "numeric",
    }).format(date);
  },

  time: (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date);
  },

  dateInput: (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "";
    return [
      String(date.getFullYear()),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  },

  localIso: (date: string, time: string) => {
    const d = new Date(`${date}T${time}:00`);
    if (isNaN(d.getTime())) return "";
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
    const mm = String(Math.abs(off) % 60).padStart(2, "0");
    return `${date}T${time}:00${sign}${hh}:${mm}`;
  },

  initials: (name?: string | null) =>
    (name ?? "?").trim().split(/\s+/).filter(Boolean)
      .map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?",
};
