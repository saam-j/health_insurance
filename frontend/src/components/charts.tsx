import type { ReactNode } from "react";

/** Hatch patterns are defined once (in Layout) and referenced by id from every chart. */
export function HatchDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <pattern id="hatch-grey" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#EEF0F1" /><line x1="0" y1="0" x2="0" y2="6" stroke="#C9CDD1" strokeWidth="2" /></pattern>
        <pattern id="hatch-red" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#FCE8E4" /><line x1="0" y1="0" x2="0" y2="6" stroke="#D4380C" strokeWidth="2" /></pattern>
        <pattern id="hatch-teal" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E3F9FD" /><line x1="0" y1="0" x2="0" y2="6" stroke="#00ABB4" strokeWidth="2" /></pattern>
      </defs>
    </svg>
  );
}

interface BarProps { x?: number; y?: number; width?: number; height?: number; highlight?: boolean; tone?: "teal" | "red" | "ink" }
/** Hatched bar with a 2px cap line: grey+teal cap normally, red+red cap for the single highlighted mark. */
export function HatchBar({ x = 0, y = 0, width = 0, height = 0, highlight, tone }: BarProps) {
  if (height <= 0) return null;
  const red = highlight || tone === "red";
  const fill = tone === "ink" ? "#16171A" : red ? "url(#hatch-red)" : tone === "teal" ? "url(#hatch-teal)" : "url(#hatch-grey)";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
      <rect x={x} y={y} width={width} height={2} fill={red ? "#D4380C" : tone === "ink" ? "#16171A" : "#00ABB4"} rx={1} />
    </g>
  );
}

export interface TipRow { color: string; label: string; value: string }
export function DarkTip({ title, rows, hint }: { title: string; rows: TipRow[]; hint?: string }) {
  return (
    <div className="min-w-[180px] rounded-xl bg-[#1B1F23] px-3.5 py-3 text-xs text-white shadow-lg">
      <p className="mb-2 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-white/80"><span className="h-2 w-2 rounded-full" style={{ background: r.color }} />{r.label}</span>
          <span className="font-semibold">{r.value}</span>
        </p>
      ))}
      {hint && <p className="mt-2 text-[11px] text-white/50">{hint}</p>}
    </div>
  );
}

export const axisStyle = { fontSize: 11, fill: "#6B7078" } as const;
export const gridProps = { vertical: false, stroke: "#EDEEEF", strokeDasharray: "0" } as const;

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return <ul className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-muted">{items.map((i) => <li key={i.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: i.color }} />{i.label}</li>)}</ul>;
}

export function ChartBox({ children, height = 260, label }: { children: ReactNode; height?: number; label: string }) {
  return <div role="img" aria-label={label} style={{ height }} className="w-full">{children}</div>;
}

/** Label / thin teal bar / percentage / fraction row (Design Spec 5.6). */
export function ProgressRow({ label, pct, detail, red }: { label: string; pct: number; detail: string; red?: boolean }) {
  return (
    <li className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-xs">
      <span className="truncate font-medium">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-muted" role="presentation"><span className={`block h-full rounded-full transition-[width] duration-700 ${red ? "bg-accent" : "bg-teal"}`} style={{ width: `${Math.min(100, pct)}%` }} /></span>
      <span className="tabular-nums text-ink-muted"><span className={`font-semibold ${red ? "text-accent" : "text-ink"}`}>{pct.toFixed(1)}%</span> · {detail}</span>
    </li>
  );
}
