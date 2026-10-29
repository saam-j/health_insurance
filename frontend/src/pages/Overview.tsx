import { Clock, ShieldAlert, Users, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Async } from "../components/Async";
import { ChartBox, DarkTip, HatchBar, axisStyle, gridProps } from "../components/charts";
import { DataTable, type Column } from "../components/DataTable";
import { InsightList } from "../components/InsightList";
import { KpiCard } from "../components/KpiCard";
import { OrbPair } from "../components/OrbPair";
import { Card, Chip, PageHeader, SimulatedTag } from "../components/ui";
import { useFilteredApi } from "../hooks/useFilteredApi";
import type { Overview as OverviewT, QueueRow } from "../types/api";
import { dec, days, int, money, moneyCompact, monthLabel, pct, signedPct, title } from "../utils/format";

export default function Overview() {
  const state = useFilteredApi<OverviewT>("/api/overview");
  const nav = useNavigate();
  return (
    <>
      <PageHeader title="Overview" subtitle="Headline cost, claims and plan performance for the selected policyholders." />
      <Async state={state}>
        {(d) => {
          const k = d.kpis;
          const change = k.claims_cost_change_pct;
          const cols: Column<QueueRow>[] = [
            { key: "id", header: "Policy", render: (r) => <span className="font-semibold">{r.policy_id}</span> },
            { key: "plan", header: "Plan", render: (r) => r.plan },
            { key: "age", header: "Age", render: (r) => r.age, align: "right" },
            { key: "region", header: "Region", render: (r) => title(r.region) },
            { key: "smoker", header: "Smoker", render: (r) => (r.smoker === "yes" ? "Yes" : "No") },
            { key: "bmi", header: "BMI", render: (r) => dec(r.bmi), align: "right" },
            { key: "charges", header: "Charges", render: (r) => <span className="font-semibold">{money(r.charges)}</span>, align: "right" },
            { key: "flag", header: "Flag", render: (r) => (r.is_outlier ? <Chip tone="red">Outlier</Chip> : <Chip>High cost</Chip>) },
          ];
          return (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard icon={Wallet} tile="teal" label="Total charges" sub="Claims cost, 12 months" value={k.total_charges} format={moneyCompact} to="/plans"
                  delta={change === null ? undefined : { text: `${signedPct(change)} vs prior 3 mo`, tone: change > 0 ? "red" : "teal" }} footnote={`${money(k.avg_charge)} per policyholder`} />
                <KpiCard icon={Users} tile="dark" label="Policyholders" sub="Distinct policies" value={k.policyholders} format={int} to="/policyholders"
                  footnote={`${int(k.claim_count)} claims filed`} />
                <KpiCard icon={Clock} tile="orange" label="Avg claim turnaround" sub="Processed claims only" value={k.avg_turnaround_days} format={(v) => days(v)} to="/claims" simulated={<SimulatedTag />}
                  delta={k.pending_claims > 0 ? { text: `${int(k.pending_claims)} pending`, tone: "grey" } : undefined} footnote="pending claims excluded" />
                <KpiCard icon={ShieldAlert} tile="deep" label="High-cost plans" sub="Loss ratio above 100%" value={k.high_cost_plans} format={int} to="/plans" simulated={<SimulatedTag />}
                  delta={{ text: k.high_cost_plans > 0 ? "Needs attention" : "None flagged", tone: k.high_cost_plans > 0 ? "red" : "teal" }} footnote={`of ${k.plans_evaluated} plan${k.plans_evaluated === 1 ? "" : "s"} shown`} />
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="Cost by plan" subtitle="Total claims cost per plan. Red marks the highest-cost plan." className="lg:col-span-2">
                  <ChartBox label="Bar chart of total claims cost by plan" height={280}>
                    <ResponsiveContainer>
                      <BarChart data={d.cost_by_plan} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="plan" tick={axisStyle} axisLine={false} tickLine={false} />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => {
                          const p = active && payload?.[0]?.payload; if (!p) return null;
                          return <DarkTip title={`${p.plan} plan`} rows={[{ color: "#00ABB4", label: "Total charges", value: money(p.total_charges) }, { color: "#8A9097", label: "Share of cost", value: pct(p.share_pct) }, { color: "#8A9097", label: "Policies", value: int(p.policies) }]} hint="Click to open plan comparison" />;
                        }} />
                        <Bar dataKey="total_charges" maxBarSize={72} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} onClick={() => nav("/plans")} cursor="pointer" isAnimationActive animationDuration={700}>
                          <LabelList dataKey="total_charges" position="top" formatter={(v: number) => moneyCompact(v)} className="num" style={{ fontSize: 12, fill: "#16171A" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                </Card>
                <Card title="Insight notes" subtitle="Rule-based findings from the selected data" action={<Link to="/insights" className="text-xs font-medium text-teal-deep hover:underline">All insights</Link>}>
                  {d.insights && d.insights.length > 0 ? <InsightList items={d.insights} /> : <p className="text-xs text-ink-muted">Too few policies for reliable findings.</p>}
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="Smoker vs non-smoker" subtitle="Average charges per policyholder">
                  {d.smoker_gauge && <OrbPair smokerAvg={d.smoker_gauge.smoker_avg} smokerN={d.smoker_gauge.smoker_n} nonAvg={d.smoker_gauge.non_smoker_avg} nonN={d.smoker_gauge.non_smoker_n} ratio={d.smoker_gauge.ratio} />}
                </Card>
                <Card title="High-cost policyholder queue" subtitle="Top 8 by charges. Select a row to open the drill-down." className="lg:col-span-2">
                  <DataTable caption="Highest-cost policyholders" columns={cols} rows={d.queue ?? []} rowKey={(r) => r.policy_id} onRowClick={(r) => nav(`/policies/${r.policy_id}`)} />
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="Portfolio metrics" subtitle="Reconciles with the cards above">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <Metric label="Average charge" value={money(k.avg_charge)} />
                    <Metric label="Average BMI" value={dec(k.avg_bmi)} />
                    <Metric label="Highest-cost policy" value={k.highest_cost_policy ? `${k.highest_cost_policy.policy_id} · ${money(k.highest_cost_policy.charges)}` : "N/A"} />
                    <Metric label="Claims per policyholder" value={dec(k.claim_frequency, 2)} sim />
                    <Metric label="Premium collected" value={moneyCompact(k.premium_collected)} sim />
                    <Metric label="Provisional profit" value={moneyCompact(k.provisional_profit)} sim neg={(k.provisional_profit ?? 0) < 0} />
                  </dl>
                </Card>
                <Card title="Monthly claims cost" subtitle="By claim month (simulated dates)" className="lg:col-span-2">
                  <ChartBox label="Line chart of monthly claims cost" height={200}>
                    <ResponsiveContainer>
                      <LineChart data={d.monthly_cost} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                        <Tooltip content={({ active, payload }) => {
                          const p = active && payload?.[0]?.payload; if (!p) return null;
                          return <DarkTip title={monthLabel(p.month)} rows={[{ color: "#00ABB4", label: "Claims cost", value: money(p.cost) }, { color: "#8A9097", label: "Claims", value: int(p.claims) }]} />;
                        }} />
                        <Line type="monotone" dataKey="cost" stroke="#00ABB4" strokeWidth={1.5} dot={{ r: 3, fill: "#00ABB4", strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#00ABB4", strokeWidth: 2, fill: "#fff" }} animationDuration={800} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                </Card>
              </div>
            </div>
          );
        }}
      </Async>
    </>
  );
}

function Metric({ label, value, sim, neg }: { label: string; value: string; sim?: boolean; neg?: boolean }) {
  return <div><dt className="eyebrow">{label}{sim && <SimulatedTag />}</dt><dd className={`num mt-1 text-xl ${neg ? "text-accent" : ""}`}>{value}</dd></div>;
}
