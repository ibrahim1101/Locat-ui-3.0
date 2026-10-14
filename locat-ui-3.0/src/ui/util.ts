import { clsx, type ClassValue } from "clsx";
export const cn = (...v: ClassValue[]) => clsx(v);

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  const u = ["KB", "MB", "GB", "TB"]; let i = -1; let n = b;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
}
export function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
export function relTime(t: number) {
  const d = Date.now() - t; const abs = Math.abs(d); const fut = d < 0;
  const f = (n: number, u: string) => (fut ? `in ${n}${u}` : `${n}${u} ago`);
  if (abs < 60_000) return fut ? "soon" : "now";
  if (abs < 3_600_000) return f(Math.round(abs / 60_000), "m");
  if (abs < 86_400_000) return f(Math.round(abs / 3_600_000), "h");
  return f(Math.round(abs / 86_400_000), "d");
}
export const clockTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
/** Deterministic gradient for fixture posters/avatars (no network images). */
export const hueGradient = (h: number) => `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 40) % 360} 45% 14%))`;
