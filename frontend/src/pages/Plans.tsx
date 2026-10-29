import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Async } from "../components/Async";
import { ChartBox, DarkTip, HatchBar, Legend, axisStyle, gridProps } from "../components/charts";
import { DataTable, type Column } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Card, Chip, PageHeader, SimulatedTag, statusTone } from "../components/ui";
import { useFilteredApi } from "../hooks/useFilteredApi";
import type { PlanRow, PlansCompare } from "../types/api";
import { days, int, money, moneyCompact, pct, signedPct } from "../utils/format";

const lr = (v: number) => `${(v * 100).toFixed(0)}%`;

function PlanDrawerBody({ plan, portfolioLr, thresholds }: { plan: PlanRow; portfolioLr: number; thresholds: { high_loss_ratio: number; efficient_loss_ratio: number } }) {
  const max = Math.max(plan.loss_ratio, portfolioLr, thresholds.high_loss_ratio) * 1.1;
  const Bar2 = ({ label, v, red }: { label: string; v: number; red?: boolean }) => (
    <div className="mb-3"><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{lr(v)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${red ? "bg-accent" : "bg-teal"}`} style={{ width: `${(v / max) * 100}%` }} /></div></div>
  );
  const row = (l: string, v: string, sim?: boolean) => <div className="flex justify-between border-b border-hairline py-2 text-sm last:border-0"><dt className="text-ink-muted">{l}{sim && <SimulatedTag />}</dt><dd className="font-medium tabular-nums">{v}</dd></div>;
  return (
    <>
      <div className="mb-4"><Chip tone={statusTone(plan.status)}>{plan.status}</Chip></div>
      <h3 className="eyebrow mb-2">Exposure vs benchmark <SimulatedTag /></h3>
      <Bar2 label={`${plan.plan} loss ratio`} v={plan.loss_ratio} red={plan.status === "High cost"} />
      <Bar2 label="Portfolio loss ratio (selection)" v={portfolioLr} />
      <p className="mb-5 text-[11px] text-ink-muted">High cost above {lr(thresholds.high_loss_ratio)}; cost-efficient at or below {lr(thresholds.efficient_loss_ratio)}. Provisional thresholds: confirm with your guide.</p>
      <dl>
        {row("Policies", int(plan.policies))}{row("Average charge", money(plan.avg_charge))}{row("Average charge vs portfolio", signedPct(plan.avg_charge_vs_portfolio_pct))}
        {row("Claims cost", money(plan.claims_cost))}{row("Premium collected", money(plan.premium), true)}{row("Provisional profit", money(plan.profit), true)}
        {row("Margin", pct(plan.margin_pct), true)}{row("Smokers in plan", pct(plan.smoker_share_pct))}{row("Avg turnaround", days(plan.avg_turnaround_days), true)}{row("Pending claims", int(plan.pending_claims), true)}
      </dl>
    </>
  );
}

export default function Plans() {
  const state = useFilteredApi<PlansCompare>("/api/plans/compare");
  const [selected, setSelected] = useState<PlanRow | null>(null);
  return (
    <>
      <PageHeader title="Plan comparison" subtitle="Premium, claims cost and provisional profitability by plan. Select a plan for details." />
      <Async state={state}>
        {(d) => {
          const plans = d.plans!, pf = d.portfolio!;
          const maxLr = Math.max(...plans.map((p) => p.loss_ratio));
          const lrData = plans.map((p) => ({ ...p, highlight: plans.length > 1 && p.loss_ratio === maxLr }));
          const wf = [
            { name: "Premium collected", range: [0, pf.premium], tone: "ink" },
            { name: "Claims cost", range: [pf.premium - pf.claims_cost, pf.premium], tone: "red" },
            { name: "Provisional profit", range: pf.profit >= 0 ? [0, pf.profit] : [pf.profit, 0], tone: pf.profit >= 0 ? "teal" : "red" },
          ];
          const cols: Column<PlanRow>[] = [
            { key: "p", header: "Plan", render: (r) => <span className="font-semibold">{r.plan}</span> },
            { key: "n", header: "Policies", render: (r) => int(r.policies), align: "right" },
            { key: "pr", header: "Premium", render: (r) => <>{moneyCompact(r.premium)}</>, align: "right" },
            { key: "c", header: "Claims cost", render: (r) => moneyCompact(r.claims_cost), align: "right" },
            { key: "l", header: "Loss ratio", render: (r) => <span className={r.status === "High cost" ? "font-semibold text-accent" : ""}>{lr(r.loss_ratio)}</span>, align: "right" },
            { key: "pf", header: "Profit", render: (r) => <span className={r.profit < 0 ? "text-accent" : ""}>{moneyCompact(r.profit)}</span>, align: "right" },
            { key: "s", header: "Status", render: (r) => <Chip tone={statusTone(r.status)}>{r.status}</Chip> },
          ];
          return (
            <div className="grid gap-3">
              <Card title="Plans" subtitle="Premium and profit are simulated. Profit = premium minus claims cost (no administrative cost)." action={<SimulatedTag />}>
                <DataTable caption="Plan comparison" columns={cols} rows={plans} rowKey={(r) => r.plan} onRowClick={setSelected} selectedKey={selected?.plan} />
              </Card>
              <div className="grid gap-3 lg:grid-cols-2">
                <Card title="Premium vs claims cost" subtitle="By plan (premium is simulated)">
                  <ChartBox label="Clustered bar chart of premium and claims cost by plan" height={250}>
                    <ResponsiveContainer><BarChart data={plans} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="plan" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                        return <DarkTip title={`${p.plan} plan`} rows={[{ color: "#00ABB4", label: "Premium", value: money(p.premium) }, { color: "#8A9097", label: "Claims cost", value: money(p.claims_cost) }, { color: p.profit < 0 ? "#D4380C" : "#00ABB4", label: "Profit", value: money(p.profit) }]} hint="Click row above for details" />; }} />
                      <Bar dataKey="premium" maxBarSize={32} shape={(p: any) => <HatchBar {...p} tone="teal" />} animationDuration={700} />
                      <Bar dataKey="claims_cost" maxBarSize={32} shape={(p: any) => <HatchBar {...p} />} animationDuration={700} />
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                  <Legend items={[{ color: "#00ABB4", label: "Premium (simulated)" }, { color: "#C9CDD1", label: "Claims cost" }]} />
                </Card>
                <Card title="Loss ratio by plan" subtitle="Claims cost / premium. Red marks the highest.">
                  <ChartBox label="Bar chart of loss ratio by plan" height={250}>
                    <ResponsiveContainer><BarChart data={lrData} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="plan" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, (m: number) => Math.max(m, d.thresholds!.high_loss_ratio * 1.2)]} />
                      <ReferenceLine y={d.thresholds!.high_loss_ratio} stroke="#16171A" strokeDasharray="4 4" label={{ value: `${lr(d.thresholds!.high_loss_ratio)} threshold`, position: "insideTopRight", fontSize: 10, fill: "#6B7078" }} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                        return <DarkTip title={`${p.plan} plan`} rows={[{ color: "#00ABB4", label: "Loss ratio", value: lr(p.loss_ratio) }, { color: "#8A9097", label: "Status", value: p.status }]} />; }} />
                      <Bar dataKey="loss_ratio" maxBarSize={56} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} onClick={(p: any) => setSelected(plans.find((x) => x.plan === p.plan) ?? null)} cursor="pointer" animationDuration={700}>
                        <LabelList dataKey="loss_ratio" position="top" formatter={(v: number) => lr(v)} className="num" style={{ fontSize: 12, fill: "#16171A" }} />
                      </Bar>
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                </Card>
              </div>
              <Card title="Premium to profit" subtitle={d.waterfall_note} action={<SimulatedTag />}>
                <ChartBox label="Waterfall chart from premium collected to claims cost to provisional profit" height={240}>
                  <ResponsiveContainer><BarChart data={wf} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={moneyCompact} width={56} tickCount={4} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                      const v = Math.abs(p.range[1] - p.range[0]); return <DarkTip title={p.name} rows={[{ color: p.tone === "red" ? "#D4380C" : "#00ABB4", label: "Amount", value: money(p.name === "Provisional profit" ? pf.profit : v) }]} />; }} />
                    <Bar dataKey="range" maxBarSize={90} shape={(p: any) => <HatchBar {...p} tone={p.payload.tone} />} animationDuration={700} />
                  </BarChart></ResponsiveContainer>
                </ChartBox>
              </Card>
              <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.plan} plan` : ""} subtitle="Plan vs portfolio benchmark">
                {selected && <PlanDrawerBody plan={selected} portfolioLr={pf.loss_ratio} thresholds={d.thresholds!} />}
              </Drawer>
            </div>
          );
        }}
      </Async>
    </>
  );
}
