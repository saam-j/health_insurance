export interface Filters { plan?: string; region?: string; age_group?: string; smoker?: string }
export interface FilterOptions { plans: string[]; regions: string[]; age_groups: string[]; smoker: string[] }
export type PlanStatus = "High cost" | "On track" | "Cost-efficient";

export interface Kpis {
  policyholders: number; total_charges: number | null; avg_charge: number | null; avg_bmi: number | null;
  highest_cost_policy: { policy_id: string; charges: number; plan: string } | null;
  claim_count: number; claim_frequency: number | null; avg_turnaround_days: number | null; pending_claims: number;
  premium_collected: number | null; provisional_profit: number | null; loss_ratio: number | null;
  high_cost_plans: number; plans_evaluated: number; claims_cost_change_pct: number | null;
}
export interface Insight {
  id: string; severity: "high" | "medium" | "info"; simulated: boolean; title: string; detail: string;
  evidence: { label: string; value: number | null }[];
}
export interface QueueRow { policy_id: string; plan: string; age: number; region: string; smoker: string; bmi: number | null; charges: number; is_outlier: boolean }
export interface Overview {
  empty: boolean; kpis: Kpis;
  cost_by_plan?: { plan: string; total_charges: number; share_pct: number; policies: number; highlight: boolean; status: PlanStatus }[];
  monthly_cost?: { month: string; cost: number; claims: number }[];
  smoker_gauge?: { smoker_avg: number | null; smoker_n: number; non_smoker_avg: number | null; non_smoker_n: number; ratio: number | null };
  queue?: QueueRow[]; insights?: Insight[];
}
export interface ClaimsView {
  empty: boolean; kpis: Kpis;
  monthly?: { month: string; claims: number; cost: number; avg_turnaround: number | null }[];
  turnaround_buckets?: { bucket: string; claims: number; share_pct: number | null; highlight: boolean }[];
  by_plan?: { plan: string; avg_turnaround_days: number | null; pending_claims: number; claims_cost: number; policies: number }[];
  pending_claims?: number;
}
export interface LedgerRow { claim_id: string; policy_id: string; plan: string; claim_date: string; processed_date: string | null; amount: number; status: string; turnaround_days: number | null }
export interface Paged<T> { total: number; page: number; page_size: number; items: T[] }
export interface Share { label: string; policies: number; share_pct: number; claims_per_policy: number | null }
export interface Driver { label: string; avg_charge: number; policies: number }
export interface Utilization {
  empty: boolean; policyholders?: number; by_plan?: Share[]; by_region?: Share[]; by_age_group?: Share[]; by_sex?: Share[];
  cost_drivers?: { age_group: Driver[]; region: Driver[]; bmi_category: Driver[]; smoker: Driver[] };
}
export interface PlanRow {
  plan: string; policies: number; premium: number; claims_cost: number; avg_charge: number; profit: number; margin_pct: number | null;
  loss_ratio: number; status: PlanStatus; avg_charge_vs_portfolio_pct: number; avg_turnaround_days: number | null; pending_claims: number; smoker_share_pct: number;
}
export interface PlansCompare {
  empty: boolean; plans?: PlanRow[];
  portfolio?: { premium: number; claims_cost: number; profit: number; loss_ratio: number; avg_charge: number };
  thresholds?: { high_loss_ratio: number; efficient_loss_ratio: number }; waterfall_note?: string;
}
export interface PolicyRow { policy_id: string; plan: string; age: number; sex: string; region: string; smoker: string; bmi: number | null; charges: number; premium: number; claim_count: number; is_outlier: boolean }
export interface ScatterPoint { policy_id: string; bmi: number; charges: number; smoker: string; is_outlier: boolean }
export interface Scatter { total: number; unavailable_bmi: number; points: ScatterPoint[] }
export interface PolicyDetail {
  policy: PolicyRow & { bmi_category: string; children: number | null; profit: number; avg_turnaround_days: number | null };
  peer_comparison: { label: string; peer_avg_charge: number; peers: number; vs_peer_pct: number };
  claims: Omit<LedgerRow, "policy_id" | "plan">[];
}
export interface InsightsResp { findings: Insight[]; limitations: string[]; note: string | null }
export interface Meta {
  dataset: string; is_synthetic: boolean; simulated_fields: string[]; policies: number; claims: number;
  quality_report: { rows_read: number; duplicates_removed: number; rows_dropped_missing_core: number; rows_dropped_invalid: number; rows_final: number; missing_values_before: Record<string, number> };
  claims_window: { from: string; to: string; as_of: string };
  thresholds: { high_loss_ratio: number; efficient_loss_ratio: number; outlier_z: number };
}
