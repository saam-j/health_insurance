import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartBox, DarkTip, Legend, axisStyle, gridProps } from "../components/charts";
import { DataTable, Pager, type Column } from "../components/DataTable";
import { Card, Chip, ErrorState, PageHeader, SimulatedTag, Skeleton, statusTone } from "../components/ui";
import { useApi } from "../hooks/useApi";
import { useFilteredApi } from "../hooks/useFilteredApi";
import { useFilters } from "../hooks/useFilters";
import type { Paged, PolicyDetail, PolicyRow, Scatter as ScatterT } from "../types/api";
import { dec, days, int, money, moneyCompact, signedPct, title, UNAVAILABLE } from "../utils/format";

function Panel({ id }: { id: string }) {
  const s = useApi<PolicyDetail>(`/api/policies/${encodeURIComponent(id)}`, {});
  if (s.error) return <ErrorState message={s.error} onRetry={s.reload} />;
  if (!s.data) return <Skeleton className="h-96" />;
  const { policy: p, peer_comparison: peer, claims } = s.data;
  const row = (l: string, v: string, sim?: boolean) => <div className="flex justify-between border-b border-hairline py-2 text-[13px] last:border-0"><dt className="text-ink-muted">{l}{sim && <SimulatedTag />}</dt><dd className="font-medium tabular-nums">{v}</dd></div>;
  return (
    <Card title={`On this policy · ${p.policy_id}`} subtitle={`${p.plan} plan`}>
      <p className="num text-3xl">{money(p.charges)}</p>
      <p className="mb-3 mt-1 text-xs text-ink-muted">total claims cost</p>
      {p.is_outlier
        ? <div className="mb-3 rounded-xl bg-accent-tint p-3 text-xs"><Chip tone="red">Outlier</Chip><p className="mt-1.5">Charges are unusually high compared with other {p.smoker === "yes" ? "smokers" : "non-smokers"} in the portfolio.</p></div>
        : <div className="mb-3 rounded-xl bg-teal-tint p-3 text-xs"><Chip tone="teal">Within normal range</Chip><p className="mt-1.5">Not flagged as an outlier among comparable policies.</p></div>}
      <dl>
        {row("Age / sex", `${p.age} · ${title(p.sex)}`)}{row("Region", title(p.region))}{row("Smoker", p.smoker === "yes" ? "Yes" : "No")}
        {row("BMI", p.bmi === null ? UNAVAILABLE : `${dec(p.bmi)} (${p.bmi_category})`)}{row("Children", p.children === null ? UNAVAILABLE : String(p.children))}
        {row("Premium", money(p.premium), true)}{row("Provisional profit", money(p.profit), true)}{row("Claims", int(p.claim_count), true)}{row("Avg turnaround", days(p.avg_turnaround_days), true)}
        {row(`vs ${peer.label} (avg ${moneyCompact(peer.peer_avg_charge)}, n=${peer.peers})`, signedPct(peer.vs_peer_pct))}
      </dl>
      <h3 className="eyebrow mb-1 mt-4">Claims <SimulatedTag /></h3>
      <div className="max-h-56 overflow-y-auto">
        <DataTable compact caption="Claims on this policy" rows={claims} rowKey={(c) => c.claim_id} columns={[
          { key: "d", header: "Date", render: (c) => c.claim_date },
          { key: "a", header: "Amount", render: (c) => money(c.amount), align: "right" },
          { key: "s", header: "Status", render: (c) => <Chip tone={statusTone(c.status)}>{c.status}</Chip> },
        ]} />
      </div>
    </Card>
  );
}

export default function PolicyDrilldown() {
  const { policyId } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { filters } = useFilters();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [page, setPage] = useState(1);
  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);
  useEffect(() => setPage(1), [q, JSON.stringify(filters)]);

  const list = useFilteredApi<Paged<PolicyRow>>("/api/policies", { page, page_size: 12, sort_by: "charges", order: "desc", q: q || undefined });
  const scatter = useFilteredApi<ScatterT>("/api/policies/scatter");
  const open = (id: string) => nav(`/policies/${id}${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  const cols: Column<PolicyRow>[] = [
    { key: "id", header: "Policy", render: (r) => <span className="font-semibold">{r.policy_id}</span> },
    { key: "plan", header: "Plan", render: (r) => r.plan },
    { key: "ch", header: "Charges", render: (r) => <span className="inline-flex items-center gap-1.5">{r.is_outlier && <span title="Outlier" className="h-1.5 w-1.5 rounded-full bg-accent" />}{moneyCompact(r.charges)}</span>, align: "right" },
  ];
  const pts = scatter.data?.points ?? [];
  const selectedPt = pts.find((p) => p.policy_id === policyId);

  return (
    <>
      <PageHeader title="Policy drill-down" subtitle="Browse plans and policies, compare BMI against charges, and inspect a single policy and its claims." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <Card title="Policies" subtitle="Sorted by charges, highest first">
          <label className="sr-only" htmlFor="pol-q">Filter by policy ID</label>
          <input id="pol-q" value={q} onChange={(e) => { setQ(e.target.value); const n = new URLSearchParams(sp); if (e.target.value) n.set("q", e.target.value); else n.delete("q"); setSp(n, { replace: true }); }}
            placeholder="Policy ID, e.g. P-00" maxLength={20} className="mb-2 h-9 w-full rounded-xl border border-hairline bg-muted px-3 text-xs" />
          {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : !list.data ? <Skeleton className="h-80" /> : list.data.total === 0 ? <p className="py-8 text-center text-xs text-ink-muted">No policies match.</p> : (
            <div className="-mx-2"><DataTable compact caption="Policies" columns={cols} rows={list.data.items} rowKey={(r) => r.policy_id} selectedKey={policyId} onRowClick={(r) => open(r.policy_id)} />
              <div className="px-2"><Pager page={page} pageSize={12} total={list.data.total} onPage={setPage} /></div></div>
          )}
        </Card>

        <div className="grid min-w-0 grid-cols-1 gap-3 lg:col-span-1 xl:contents">
          <Card title="BMI vs charges" subtitle={scatter.data ? `${int(scatter.data.points.length)} policies plotted${scatter.data.unavailable_bmi ? ` · ${scatter.data.unavailable_bmi} without BMI not shown` : ""}. Click a point to open it.` : "Loading…"}>
            {scatter.error ? <ErrorState message={scatter.error} onRetry={scatter.reload} /> : !scatter.data ? <Skeleton className="h-80" /> : pts.length === 0 ? <p className="py-16 text-center text-sm text-ink-muted">No policies with BMI for these filters.</p> : (
              <>
                <ChartBox label="Scatter chart of BMI against charges" height={340}>
                  <ResponsiveContainer><ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis type="number" dataKey="bmi" name="BMI" domain={["dataMin - 1", "dataMax + 1"]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => Number(v).toFixed(0)} />
                    <YAxis type="number" dataKey="charges" name="Charges" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                    <ZAxis range={[26, 26]} />
                    <Tooltip cursor={false} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                      return <DarkTip title={p.policy_id} rows={[{ color: p.smoker === "yes" ? "#6B7078" : "#C9CDD1", label: p.smoker === "yes" ? "Smoker" : "Non-smoker", value: "" }, { color: "#00ABB4", label: "BMI", value: dec(p.bmi) }, { color: "#00ABB4", label: "Charges", value: money(p.charges) }]} hint="Click to drill down" />; }} />
                    <Scatter data={pts.filter((p) => p.smoker === "no" && p.policy_id !== policyId)} fill="#C9CDD1" fillOpacity={0.8} isAnimationActive={false} onClick={(p: any) => open(p.policy_id)} cursor="pointer" />
                    <Scatter data={pts.filter((p) => p.smoker === "yes" && p.policy_id !== policyId)} fill="#6B7078" fillOpacity={0.75} isAnimationActive={false} onClick={(p: any) => open(p.policy_id)} cursor="pointer" />
                    {selectedPt && <Scatter data={[selectedPt]} isAnimationActive={false}
                      shape={(p: any) => <g><circle cx={p.cx} cy={p.cy} r={11} fill="none" stroke={selectedPt.is_outlier ? "#D4380C" : "#00ABB4"} strokeWidth={2} /><circle cx={p.cx} cy={p.cy} r={5} fill={selectedPt.is_outlier ? "#D4380C" : "#00ABB4"} /></g>} />}
                  </ScatterChart></ResponsiveContainer>
                </ChartBox>
                <Legend items={[{ color: "#C9CDD1", label: "Non-smoker" }, { color: "#6B7078", label: "Smoker" }, { color: "#00ABB4", label: "Selected" }, { color: "#D4380C", label: "Selected outlier" }]} />
              </>
            )}
          </Card>
          <div className="xl:col-start-3">
            {policyId ? <Panel key={policyId} id={policyId} /> : (
              <Card title="On this policy"><p className="py-10 text-center text-sm text-ink-muted">Select a policy from the list or the chart to see its metrics and claims.</p></Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
