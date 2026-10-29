import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useCountUp } from "../hooks/useCountUp";
import { Chip } from "./ui";

interface Props {
  icon: LucideIcon; tile?: "teal" | "orange" | "dark" | "deep"; label: string; sub: string; value: number | null;
  format: (v: number | null) => string; delta?: { text: string; tone: "teal" | "red" | "grey" }; footnote: string; to?: string; simulated?: ReactNode;
}
const tiles = { teal: "bg-teal-icon", orange: "bg-accent-orange", dark: "bg-ink", deep: "bg-teal-deep" };

export function KpiCard({ icon: Icon, tile = "teal", label, sub, value, format, delta, footnote, to, simulated }: Props) {
  const v = useCountUp(value);
  return (
    <article className="card enter group relative transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-white ${tiles[tile]}`}><Icon size={16} strokeWidth={1.5} /></span>
        <div className="min-w-0 flex-1"><h3 className="text-[13px] font-medium leading-tight">{label}{simulated}</h3><p className="text-[11px] text-ink-muted">{sub}</p></div>
        {to && <Link to={to} aria-label={`Open ${label} details`} className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-ink-muted transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white"><ArrowUpRight size={14} /></Link>}
      </div>
      <p className="num mt-4 text-[34px] leading-none">{format(v)}</p>
      <div className="mt-3 flex items-center gap-2">
        {delta && <Chip tone={delta.tone}>{delta.text}</Chip>}
        <span className="truncate text-[11px] text-ink-muted">{footnote}</span>
      </div>
    </article>
  );
}
