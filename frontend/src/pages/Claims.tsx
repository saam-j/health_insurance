import { Activity, Clock, Hourglass, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Async } from "../components/Async";
import { ChartBox, DarkTip, HatchBar, axisStyle, gridProps } from "../components/charts";
import { DataTable, Pager, type Column } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { Card, Chip, ErrorState, PageHeader, SimulatedTag, statusTone } from "../components/ui";
import { useFilteredApi } from "../hooks/useFilteredApi";
import { useFilters } from "../hooks/useFilters";
import type { ClaimsView, LedgerRow, Paged } from "../types/api";
import { dec, days, int, money, moneyCompact, monthLabel, pct, UNAVAILABLE } from "../utils/format";

function Ledger() {
  const { filters } = useFilters();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  useEffect(() => setPage(1), [JSON.stringify(filters), status]);
  const s = useFilteredApi<Paged<LedgerRow>>("/api/claims/ledger", { page, page_size: 10, status });
  const cols: Column<LedgerRow>[] = [
    { key: "id", header: "Claim", render: (r) => <span className="font-semibold">{r.claim_id}</span> },
    { key: "pol", header: "Policy", render: (r) => r.policy_id },
    { key: "plan", header: "Plan", render: (r) => r.plan },
    { key: "date", header: "Claim date", render: (r) => r.claim_date },
    { key: "proc", header: "Processed", render: (r) => r.processed_date ?? UNAVAILABLE },
    { key: "days", header: "Turnaround", render: (r) => (r.turnaround_days === null ? UNAVAILABLE : `${r.turnaround_days} d`), align: "right" },
    { key: "amt", header: "Amount", render: (r) => <span className="font-semibold">{money(r.amount)}</span>, align: "right" },
    { key: "st", header: "Status", render: (r) => <Chip tone={statusTone(r.status)}>{r.status}</Chip> },
  ];
  return (
    <Card title="Claims ledger" subtitle="Dates and processing times are simulated" action={
      <select aria-label="Claim status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border border-hairline bg-muted px-3 text-xs font-medium">
        <option value="">All statuses</option><option value="Processed">Processed</option><option value="Pending">Pending</option>
      </select>}>
      {s.error ? <ErrorState message={s.error} onRetry={s.reload} /> : !s.data ? <div className="skel h-64" /> : s.data.total === 0 ? <p className="py-8 text-center text-sm text-ink-muted">No claims match these filters.</p> : (
        <><DataTable caption="Claims ledger" columns={cols} rows={s.data.items} rowKey={(r) => r.claim_id} />
          <Pager page={page} pageSize={10} total={s.data.total} onPage={setPage} /></>)}
    </Card>
  );
}

export default function Claims() {
  const state = useFilteredApi<ClaimsView>("/api/claims");
  return (
    <>
      <PageHeader title="Claims performance" subtitle="Claim frequency, cost and processing turnaround." />
      <Async state={state}>
        {(d) => {
          const k = d.kpis;
          const maxCost = Math.max(...(d.monthly ?? []).map((m) => m.cost));
          const monthly = (d.monthly ?? []).map((m) => ({ ...m, highlight: m.cost === maxCost }));
          return (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard icon={Activity} tile="dark" label="Claims filed" sub="12-month window" value={k.claim_count} format={int} footnote={`${dec(k.claim_frequency, 2)} per policyholder`} simulated={<SimulatedTag />} />
                <KpiCard icon={Wallet} tile="teal" label="Claims cost" sub="Sum of claim amounts" value={k.total_charges} format={moneyCompact} footnote={`${money(k.avg_charge)} per policyholder`} />
                <KpiCard icon={Clock} tile="orange" label="Avg turnaround" sub="Processed claims only" value={k.avg_turnaround_days} format={(v) => days(v)} footnote="claim date to processed date" simulated={<SimulatedTag />} />
                <KpiCard icon={Hourglass} tile="deep" label="Pending claims" sub="Not yet processed" value={k.pending_claims} format={int} footnote="turnaround unavailable until processed" simulated={<SimulatedTag />} />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="Claims cost by month" subtitle="Red marks the highest month" className="lg:col-span-2">
                  <ChartBox label="Bar chart of claims cost by month" height={260}>
                    <ResponsiveContainer><BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} tick={axisStyle} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={44} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                        return <DarkTip title={monthLabel(p.month)} rows={[{ color: "#00ABB4", label: "Claims cost", value: money(p.cost) }, { color: "#8A9097", label: "Claims", value: int(p.claims) }, { color: "#8A9097", label: "Avg turnaround", value: days(p.avg_turnaround) }]} />; }} />
                      <Bar dataKey="cost" maxBarSize={36} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} animationDuration={700} />
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                </Card>
                <Card title="Turnaround distribution" subtitle="Processed claims by days to process">
                  <ChartBox label="Bar chart of claims by turnaround bucket" height={260}>
                    <ResponsiveContainer><BarChart data={d.turnaround_buckets} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="bucket" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                        return <DarkTip title={p.bucket} rows={[{ color: "#00ABB4", label: "Claims", value: int(p.claims) }, { color: "#8A9097", label: "Share", value: pct(p.share_pct) }]} />; }} />
                      <Bar dataKey="claims" maxBarSize={48} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} animationDuration={700}>
                        <LabelList dataKey="claims" position="top" className="num" style={{ fontSize: 12, fill: "#16171A" }} />
                      </Bar>
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                </Card>
              </div>
              <Card title="Turnaround by plan" subtitle="Pending claims are excluded from the average, not counted as zero days">
                <DataTable caption="Turnaround by plan" rows={d.by_plan ?? []} rowKey={(r) => r.plan} columns={[
                  { key: "p", header: "Plan", render: (r) => <span className="font-semibold">{r.plan}</span> },
                  { key: "n", header: "Policies", render: (r) => int(r.policies), align: "right" },
                  { key: "c", header: "Claims cost", render: (r) => money(r.claims_cost), align: "right" },
                  { key: "t", header: "Avg turnaround", render: (r) => days(r.avg_turnaround_days), align: "right" },
                  { key: "pe", header: "Pending", render: (r) => int(r.pending_claims), align: "right" },
                ]} />
              </Card>
              <Ledger />
            </div>
          );
        }}
      </Async>
    </>
  );
}
