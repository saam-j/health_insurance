import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Async } from "../components/Async";
import { ChartBox, DarkTip, HatchBar, ProgressRow, axisStyle, gridProps } from "../components/charts";
import { Card, PageHeader } from "../components/ui";
import { useFilteredApi } from "../hooks/useFilteredApi";
import type { Driver, Share, Utilization } from "../types/api";
import { dec, int, money, moneyCompact, title } from "../utils/format";

function Rows({ items, fmt = (s: string) => s }: { items: Share[]; fmt?: (s: string) => string }) {
  return <ul className="grid gap-3">{items.map((i) => <ProgressRow key={i.label} label={fmt(i.label)} pct={i.share_pct} detail={`${int(i.policies)} · ${dec(i.claims_per_policy, 1)} claims each`} />)}</ul>;
}

function DriverChart({ name, data, fmt = (s: string) => s }: { name: string; data: Driver[]; fmt?: (s: string) => string }) {
  const max = Math.max(...data.map((d) => d.avg_charge));
  const rows = data.map((d) => ({ ...d, label: fmt(d.label), highlight: d.avg_charge === max && data.length > 1 }));
  return (
    <Card title={`Average charge by ${name}`} subtitle="Red marks the highest group">
      <ChartBox label={`Bar chart of average charge by ${name}`} height={210}>
        <ResponsiveContainer><BarChart data={rows} margin={{ top: 22, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval={0} />
          <YAxis hide />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
            return <DarkTip title={p.label} rows={[{ color: "#00ABB4", label: "Average charge", value: money(p.avg_charge) }, { color: "#8A9097", label: "Policyholders", value: int(p.policies) }]} />; }} />
          <Bar dataKey="avg_charge" maxBarSize={44} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} animationDuration={700}>
            <LabelList dataKey="avg_charge" position="top" formatter={(v: number) => moneyCompact(v)} className="num" style={{ fontSize: 11, fill: "#16171A" }} />
          </Bar>
        </BarChart></ResponsiveContainer>
      </ChartBox>
    </Card>
  );
}

export default function Policyholders() {
  const state = useFilteredApi<Utilization>("/api/utilization");
  return (
    <>
      <PageHeader title="Policyholders and utilization" subtitle="Enrollment, plan utilization and the factors associated with higher charges." />
      <Async state={state}>
        {(d) => {
          const plans = (d.by_plan ?? []).map((p) => ({ ...p, highlight: p.policies === Math.max(...(d.by_plan ?? []).map((x) => x.policies)) }));
          const cd = d.cost_drivers!;
          return (
            <div className="grid gap-3">
              <div className="grid gap-3 lg:grid-cols-3">
                <Card title="Enrollment by plan" subtitle={`${int(d.policyholders)} policyholders. Red marks the largest plan.`} className="lg:col-span-2">
                  <ChartBox label="Bar chart of policyholders by plan" height={250}>
                    <ResponsiveContainer><BarChart data={plans} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} content={({ active, payload }) => { const p = active && payload?.[0]?.payload; if (!p) return null;
                        return <DarkTip title={`${p.label} plan`} rows={[{ color: "#00ABB4", label: "Policyholders", value: int(p.policies) }, { color: "#8A9097", label: "Share", value: `${dec(p.share_pct)}%` }, { color: "#8A9097", label: "Claims per policy", value: dec(p.claims_per_policy, 2) }]} />; }} />
                      <Bar dataKey="policies" maxBarSize={72} shape={(p: any) => <HatchBar {...p} highlight={p.payload.highlight} />} animationDuration={700}>
                        <LabelList dataKey="policies" position="top" className="num" style={{ fontSize: 12, fill: "#16171A" }} />
                      </Bar>
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                </Card>
                <Card title="By region" subtitle="Share of policyholders"><Rows items={d.by_region ?? []} fmt={title} /></Card>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Card title="By age group" subtitle="Share of policyholders · claims per policy (simulated)"><Rows items={d.by_age_group ?? []} /></Card>
                <Card title="By sex" subtitle="Share of policyholders"><Rows items={d.by_sex ?? []} fmt={title} /></Card>
              </div>
              <h2 className="mt-2 font-display text-lg font-medium">Cost drivers</h2>
              <p className="-mt-2 text-xs text-ink-muted">Average charge per policyholder by group. These are associations in this dataset, not proven causes.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <DriverChart name="age group" data={cd.age_group} />
                <DriverChart name="region" data={cd.region} fmt={title} />
                <DriverChart name="BMI category" data={cd.bmi_category} />
                <DriverChart name="smoking status" data={cd.smoker} />
              </div>
            </div>
          );
        }}
      </Async>
    </>
  );
}
