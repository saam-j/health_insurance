import { Async } from "../components/Async";
import { InsightList } from "../components/InsightList";
import { Card, Chip, ErrorState, PageHeader, Skeleton } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { useFilteredApi } from "../hooks/useFilteredApi";
import type { InsightsResp, Meta } from "../types/api";
import { dec, int, money } from "../utils/format";

function fmtEvidence(label: string, v: number | null): string {
  if (v === null) return "N/A";
  const l = label.toLowerCase();
  if (l.includes("ratio")) return `${(v * 100).toFixed(0)}%`;
  if (l.includes("days")) return `${dec(v, 1)} days`;
  if (l.includes("share")) return `${dec(v, 1)}%`;
  if (l.includes("policyholders")) return int(v);
  return money(v);
}

function DataNotes() {
  const s = useApi<Meta>("/api/meta", {});
  if (s.error) return <ErrorState message={s.error} onRetry={s.reload} />;
  if (!s.data) return <Skeleton className="h-64" />;
  const m = s.data, q = m.quality_report;
  const r = (l: string, v: string | number) => <div className="flex justify-between border-b border-hairline py-2 text-sm last:border-0"><dt className="text-ink-muted">{l}</dt><dd className="font-medium tabular-nums">{v}</dd></div>;
  return (
    <Card title="Data notes and quality" subtitle="Where the numbers come from">
      <div className="mb-3 flex flex-wrap items-center gap-2"><Chip tone={m.is_synthetic ? "red" : "teal"}>{m.is_synthetic ? "Synthetic demonstration data" : "Source file"}</Chip><span className="text-xs text-ink-muted">{m.dataset}</span></div>
      <dl>
        {r("Rows read", int(q.rows_read))}{r("Duplicates removed", int(q.duplicates_removed))}{r("Dropped: missing core field", int(q.rows_dropped_missing_core))}
        {r("Dropped: invalid value", int(q.rows_dropped_invalid))}{r("Rows analysed", int(q.rows_final))}{r("Claims generated", int(m.claims))}
        {r("Claims window", `${m.claims_window.from} to ${m.claims_window.to}`)}
      </dl>
      <h3 className="eyebrow mb-2 mt-4">Simulated fields</h3>
      <div className="flex flex-wrap gap-1.5">{m.simulated_fields.map((f) => <Chip key={f}>{f}</Chip>)}</div>
      <h3 className="eyebrow mb-1 mt-4">Provisional rules</h3>
      <p className="text-xs text-ink-muted">High-cost plan: loss ratio above {(m.thresholds.high_loss_ratio * 100).toFixed(0)}%. Cost-efficient: at or below {(m.thresholds.efficient_loss_ratio * 100).toFixed(0)}%. Outlier: charges more than {m.thresholds.outlier_z} standard deviations above the mean of the same smoker group.</p>
    </Card>
  );
}

export default function Insights() {
  const state = useFilteredApi<InsightsResp & { empty?: boolean }>("/api/insights");
  return (
    <>
      <PageHeader title="Insights" subtitle="Rule-based findings from the selected data, with the evidence behind each one." />
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Async state={state}>
            {(d) => d.findings.length === 0 ? <Card><p className="text-sm text-ink-muted">{d.note ?? "No findings for this selection."}</p></Card> : (
              <div className="grid gap-3">
                <Card title="Findings"><InsightList items={d.findings} /></Card>
                <Card title="Evidence">
                  <div className="grid gap-4 sm:grid-cols-2">{d.findings.map((f) => (
                    <div key={f.id}><p className="mb-1 text-xs font-medium">{f.title}</p>
                      <dl className="text-xs">{f.evidence.map((e) => <div key={e.label} className="flex justify-between border-b border-hairline py-1.5"><dt className="text-ink-muted">{e.label}</dt><dd className="font-medium tabular-nums">{fmtEvidence(e.label, e.value)}</dd></div>)}</dl></div>
                  ))}</div>
                </Card>
                <Card title="Limitations"><ul className="list-disc space-y-1 pl-5 text-xs text-ink-muted">{d.limitations.map((l) => <li key={l}>{l}</li>)}</ul></Card>
              </div>
            )}
          </Async>
        </div>
        <DataNotes />
      </div>
    </>
  );
}
