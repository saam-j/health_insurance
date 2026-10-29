import { SlidersHorizontal, X } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useFilters } from "../hooks/useFilters";
import type { FilterOptions, Filters } from "../types/api";
import { title } from "../utils/format";

function Select({ id, label, value, options, onChange, fmt = (s: string) => s }: { id: string; label: string; value?: string; options: string[]; onChange: (v: string) => void; fmt?: (s: string) => string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="eyebrow hidden sm:inline">{label}</span>
      <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-xl border border-hairline bg-muted px-3 text-xs font-medium text-ink transition-colors hover:border-ink-muted">
        <option value="">{`All${label === "Smoker" ? "" : "s"}`.replace("Alls", "All")}</option>
        {options.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
      </select>
    </label>
  );
}

export function FilterBar() {
  const { filters, setFilter, reset, active } = useFilters();
  const { data } = useApi<FilterOptions>("/api/filters", {});
  const set = (k: keyof Filters) => (v: string) => setFilter(k, v);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-2.5" role="group" aria-label="Dashboard filters">
      <span className="flex items-center gap-2 text-xs font-medium"><SlidersHorizontal size={14} />Filters{active > 0 && <span className="rounded-full bg-teal-deep px-1.5 text-[10px] text-white">{active}</span>}</span>
      <Select id="f-plan" label="Plan" value={filters.plan} options={data?.plans ?? []} onChange={set("plan")} />
      <Select id="f-region" label="Region" value={filters.region} options={data?.regions ?? []} onChange={set("region")} fmt={title} />
      <Select id="f-age" label="Age group" value={filters.age_group} options={data?.age_groups ?? []} onChange={set("age_group")} />
      <Select id="f-smoker" label="Smoker" value={filters.smoker} options={data?.smoker ?? []} onChange={set("smoker")} fmt={(s) => (s === "yes" ? "Smokers" : "Non-smokers")} />
      {active > 0 && <button onClick={reset} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-hairline px-3 text-xs font-medium hover:bg-muted"><X size={14} />Clear</button>}
    </div>
  );
}
