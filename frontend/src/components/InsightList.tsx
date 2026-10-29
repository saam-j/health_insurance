import type { Insight } from "../types/api";
import { Chip, SimulatedTag } from "./ui";

const sev = { high: "red", medium: "grey", info: "teal" } as const;
const label = { high: "High", medium: "Medium", info: "Info" } as const;

export function InsightList({ items }: { items: Insight[] }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((i) => (
        <li key={i.id} className="rounded-2xl bg-muted p-3.5">
          <div className="mb-1 flex items-center gap-2"><Chip tone={sev[i.severity]}>{label[i.severity]}</Chip>{i.simulated && <SimulatedTag />}</div>
          <p className="text-[13px] font-medium">{i.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{i.detail}</p>
        </li>
      ))}
    </ul>
  );
}
