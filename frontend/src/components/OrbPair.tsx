import { dec, money } from "../utils/format";

function Orb({ label, value, n, color }: { label: string; value: number | null; n: number; color: "teal" | "red" }) {
  const grad = color === "teal" ? "radial-gradient(circle at 35% 30%, #7fe3e8, #00ABB4 60%, #126463)" : "radial-gradient(circle at 35% 30%, #ffb199, #FE5521 55%, #D4380C)";
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <p className="num text-2xl">{value === null ? "N/A" : money(value)}</p>
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-hairline" aria-hidden>
        <div className="h-20 w-20 rounded-full shadow-[0_0_28px_rgba(0,171,180,0.25)]" style={{ background: value === null ? "#F2F4F4" : grad }} />
      </div>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-ink-muted">{n.toLocaleString()} policyholders</p>
    </div>
  );
}

export function OrbPair({ smokerAvg, smokerN, nonAvg, nonN, ratio }: { smokerAvg: number | null; smokerN: number; nonAvg: number | null; nonN: number; ratio: number | null }) {
  return (
    <div>
      <div className="flex gap-4"><Orb label="Smokers" value={smokerAvg} n={smokerN} color="red" /><Orb label="Non-smokers" value={nonAvg} n={nonN} color="teal" /></div>
      <p className="mt-3 text-center text-xs text-ink-muted">{ratio === null ? "Select both groups to compare." : `Smokers average ${dec(ratio, 1)}x the charges of non-smokers.`}</p>
    </div>
  );
}
