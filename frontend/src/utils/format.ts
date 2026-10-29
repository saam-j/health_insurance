// Currency: the Design Spec leaves this open (USD vs INR). The source dataset is USD, so USD is used consistently.
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const UNAVAILABLE = "N/A";

export const money = (v: number | null | undefined) => (v === null || v === undefined ? UNAVAILABLE : usd0.format(v));
export function moneyCompact(v: number | null | undefined): string {
  if (v === null || v === undefined) return UNAVAILABLE;
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(0)}`;
}
export const int = (v: number | null | undefined) => (v === null || v === undefined ? UNAVAILABLE : Math.round(v).toLocaleString("en-US"));
export const dec = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? UNAVAILABLE : v.toFixed(d));
export const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? UNAVAILABLE : `${v.toFixed(d)}%`);
export const signedPct = (v: number | null | undefined) => (v === null || v === undefined ? UNAVAILABLE : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
export const days = (v: number | null | undefined) => (v === null || v === undefined ? UNAVAILABLE : `${v.toFixed(1)} days`);
export const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleString("en-US", { month: "short", year: "2-digit" });
