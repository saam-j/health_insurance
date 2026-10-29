"""Shared analytics layer: every endpoint computes KPIs here so cards, charts and tables always agree.

Definitions (provisional where the PRD marks an assumption):
- total charges            = sum of policy `charges` (= sum of that policy's claim amounts)
- average charge           = total charges / policyholders
- policyholders            = distinct policy_id after filtering
- claim frequency          = claims / policyholders over the claims window (12 months, simulated)
- claim turnaround         = processed_date - claim_date in days, PROCESSED claims only (pending = unavailable)
- premium collected        = sum of `premium` (SIMULATED)
- provisional profit       = premium collected - claims cost (excludes administrative expenses)
- loss ratio               = claims cost / premium collected
- high-cost plan           = loss ratio > HIGH_LOSS_RATIO; cost-efficient = loss ratio <= EFFICIENT_LOSS_RATIO
- outlier policy           = charges z-score > OUTLIER_Z within the same smoker group
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from app.core.config import settings
from app.data.loader import AGE_LABELS, Dataset
from app.schemas.filters import Filters


def num(x, nd: int = 2):
    """JSON-safe number: NaN/None -> None (unavailable), numpy -> python."""
    if x is None:
        return None
    try:
        if isinstance(x, (float, np.floating)) and (math.isnan(x) or math.isinf(x)):
            return None
        if pd.isna(x):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(x, (np.integer, int)) and not isinstance(x, bool):
        return int(x)
    return round(float(x), nd)


def apply_filters(ds: Dataset, f: Filters) -> tuple[pd.DataFrame, pd.DataFrame]:
    p = ds.policies
    mask = pd.Series(True, index=p.index)
    if f.plan: mask &= p["plan"] == f.plan
    if f.region: mask &= p["region"] == f.region
    if f.age_group: mask &= p["age_group"] == f.age_group
    if f.smoker: mask &= p["smoker"] == f.smoker
    pol = p[mask]
    cl = ds.claims[ds.claims["policy_id"].isin(pol["policy_id"])]
    return pol, cl


def filter_options(ds: Dataset) -> dict:
    p = ds.policies
    return {
        "plans": sorted(p["plan"].unique(), key=["Bronze", "Silver", "Gold", "Platinum"].index),
        "regions": sorted(p["region"].unique()),
        "age_groups": [a for a in AGE_LABELS if a in set(p["age_group"])],
        "smoker": ["yes", "no"],
    }


def plan_stats(pol: pd.DataFrame, cl: pd.DataFrame) -> list[dict]:
    if pol.empty:
        return []
    overall_avg = pol["charges"].mean()
    claim_plan = cl.merge(pol[["policy_id", "plan"]], on="policy_id")
    ta = claim_plan.groupby("plan")["turnaround_days"].mean()
    pend = claim_plan[claim_plan["status"] == "Pending"].groupby("plan").size()
    out = []
    for plan, g in pol.groupby("plan"):
        premium, cost = g["premium"].sum(), g["charges"].sum()
        lr = cost / premium if premium else float("nan")
        status = "On track"
        if lr > settings.high_loss_ratio: status = "High cost"
        elif lr <= settings.efficient_loss_ratio: status = "Cost-efficient"
        out.append({
            "plan": plan, "policies": int(len(g)), "premium": num(premium), "claims_cost": num(cost),
            "avg_charge": num(g["charges"].mean()), "profit": num(premium - cost),
            "margin_pct": num((premium - cost) / premium * 100 if premium else None, 1),
            "loss_ratio": num(lr, 3), "status": status,
            "avg_charge_vs_portfolio_pct": num((g["charges"].mean() / overall_avg - 1) * 100, 1),
            "avg_turnaround_days": num(ta.get(plan), 1), "pending_claims": int(pend.get(plan, 0)),
            "smoker_share_pct": num((g["smoker"] == "yes").mean() * 100, 1),
        })
    order = ["Bronze", "Silver", "Gold", "Platinum"]
    return sorted(out, key=lambda r: order.index(r["plan"]))


def _change_pct(cl: pd.DataFrame) -> float | None:
    """Claims cost of the latest 3 months vs the 3 months before (by claim month)."""
    months = sorted(cl["month"].unique())
    if len(months) < 6:
        return None
    last, prev = months[-3:], months[-6:-3]
    a, b = cl[cl["month"].isin(last)]["amount"].sum(), cl[cl["month"].isin(prev)]["amount"].sum()
    return num((a / b - 1) * 100, 1) if b else None


def kpis(pol: pd.DataFrame, cl: pd.DataFrame) -> dict:
    n = len(pol)
    total = pol["charges"].sum()
    premium, claim_n = pol["premium"].sum(), len(cl)
    top = pol.loc[pol["charges"].idxmax()] if n else None
    plans = plan_stats(pol, cl)
    return {
        "policyholders": n,
        "total_charges": num(total),
        "avg_charge": num(pol["charges"].mean() if n else None),
        "avg_bmi": num(pol["bmi"].mean() if n else None),
        "highest_cost_policy": {"policy_id": top["policy_id"], "charges": num(top["charges"]), "plan": top["plan"]} if top is not None else None,
        "claim_count": claim_n,
        "claim_frequency": num(claim_n / n if n else None),
        "avg_turnaround_days": num(cl["turnaround_days"].mean(), 1),
        "pending_claims": int((cl["status"] == "Pending").sum()),
        "premium_collected": num(premium),
        "provisional_profit": num(premium - total),
        "loss_ratio": num(total / premium if premium else None, 3),
        "high_cost_plans": int(sum(p["status"] == "High cost" for p in plans)),
        "plans_evaluated": len(plans),
        "claims_cost_change_pct": _change_pct(cl),
    }


def cost_drivers(pol: pd.DataFrame) -> dict:
    def grp(col, order=None):
        if pol.empty:
            return []
        g = pol.groupby(col).agg(avg_charge=("charges", "mean"), policies=("policy_id", "count")).reset_index()
        if order:
            g["k"] = g[col].map({v: i for i, v in enumerate(order)}); g = g.sort_values("k")
        return [{"label": str(r[col]), "avg_charge": num(r["avg_charge"]), "policies": int(r["policies"])} for _, r in g.iterrows()]
    return {
        "age_group": grp("age_group", AGE_LABELS),
        "region": grp("region"),
        "bmi_category": grp("bmi_category", ["Underweight", "Normal", "Overweight", "Obese", "Unknown"]),
        "smoker": [{**r, "label": "Smoker" if r["label"] == "yes" else "Non-smoker"} for r in grp("smoker", ["no", "yes"])],
    }


def outlier_flags(pol: pd.DataFrame, universe: pd.DataFrame) -> pd.Series:
    """z-score of charges within smoker group, computed on the full (unfiltered) portfolio so the flag is stable."""
    stats = universe.groupby("smoker")["charges"].agg(["mean", "std"])
    z = (pol["charges"] - pol["smoker"].map(stats["mean"])) / pol["smoker"].map(stats["std"])
    return z > settings.outlier_z


def overview(ds: Dataset, f: Filters) -> dict:
    pol, cl = apply_filters(ds, f)
    k = kpis(pol, cl)
    if pol.empty:
        return {"empty": True, "kpis": k}
    plans = plan_stats(pol, cl)
    max_cost = max(p["claims_cost"] for p in plans)
    monthly = cl.groupby("month").agg(cost=("amount", "sum"), claims=("claim_id", "count")).reset_index()
    sm = pol.groupby("smoker")["charges"].agg(["mean", "count"])
    smoker_avg = sm["mean"].get("yes"); non_avg = sm["mean"].get("no")
    flags = outlier_flags(pol, ds.policies)
    queue = pol.assign(is_outlier=flags).nlargest(8, "charges")
    return {
        "empty": False, "kpis": k,
        "cost_by_plan": [{"plan": p["plan"], "total_charges": p["claims_cost"], "share_pct": num(p["claims_cost"] / k["total_charges"] * 100, 1),
                          "policies": p["policies"], "highlight": p["claims_cost"] == max_cost, "status": p["status"]} for p in plans],
    "monthly_cost": [{"month": r["month"], "cost": num(r["cost"]), "claims": int(r["claims"])} for _, r in monthly.iterrows()],
        "smoker_gauge": {
            "smoker_avg": num(smoker_avg), "smoker_n": int(sm["count"].get("yes", 0)),
            "non_smoker_avg": num(non_avg), "non_smoker_n": int(sm["count"].get("no", 0)),
            "ratio": num(smoker_avg / non_avg, 2) if smoker_avg is not None and non_avg else None,
        },
        "queue": [{"policy_id": r.policy_id, "plan": r.plan, "age": int(r.age), "region": r.region, "smoker": r.smoker,
                   "bmi": num(r.bmi), "charges": num(r.charges), "is_outlier": bool(r.is_outlier)} for r in queue.itertuples()],
        "insights": insights(ds, f)["findings"][:3],
    }


def claims_view(ds: Dataset, f: Filters) -> dict:
    pol, cl = apply_filters(ds, f)
    if pol.empty:
        return {"empty": True, "kpis": kpis(pol, cl)}
    monthly = cl.groupby("month").agg(claims=("claim_id", "count"), cost=("amount", "sum"), avg_turnaround=("turnaround_days", "mean")).reset_index()
    done = cl[cl["status"] == "Processed"]
    bins = pd.cut(done["turnaround_days"], [0, 7, 14, 30, 10_000], labels=["1-7 days", "8-14 days", "15-30 days", "31+ days"])
    buckets = bins.value_counts().reindex(["1-7 days", "8-14 days", "15-30 days", "31+ days"]).fillna(0)
    max_bucket = buckets.max()
    return {
        "empty": False, "kpis": kpis(pol, cl),
        "monthly": [{"month": r.month, "claims": int(r.claims), "cost": num(r.cost), "avg_turnaround": num(r.avg_turnaround, 1)} for r in monthly.itertuples()],
        "turnaround_buckets": [{"bucket": b, "claims": int(v), "share_pct": num(v / len(done) * 100, 1) if len(done) else None, "highlight": bool(v == max_bucket)} for b, v in buckets.items()],
        "by_plan": [{k2: p[k2] for k2 in ("plan", "avg_turnaround_days", "pending_claims", "claims_cost", "policies")} for p in plan_stats(pol, cl)],
        "pending_claims": int((cl["status"] == "Pending").sum()),
    }


def claims_ledger(ds: Dataset, f: Filters, page: int, page_size: int, status: str | None) -> dict:
    pol, cl = apply_filters(ds, f)
    d = cl.merge(pol[["policy_id", "plan"]], on="policy_id")
    if status in ("Processed", "Pending"):
        d = d[d["status"] == status]
    d = d.sort_values(["claim_date", "claim_id"], ascending=[False, True])
    total = len(d)
    page_df = d.iloc[(page - 1) * page_size: page * page_size]
    return {"total": total, "page": page, "page_size": page_size, "items": [
        {"claim_id": r.claim_id, "policy_id": r.policy_id, "plan": r.plan, "claim_date": r.claim_date.strftime("%Y-%m-%d"),
         "processed_date": None if pd.isna(r.processed_date) else r.processed_date.strftime("%Y-%m-%d"),
         "amount": num(r.amount), "status": r.status, "turnaround_days": num(r.turnaround_days, 0)} for r in page_df.itertuples()]}


def utilization(ds: Dataset, f: Filters) -> dict:
    pol, cl = apply_filters(ds, f)
    if pol.empty:
        return {"empty": True}
    n = len(pol)

    def share(col, order=None):
        g = pol.groupby(col).agg(policies=("policy_id", "count"), claims=("claim_count", "sum")).reset_index()
        if order:
            g["k"] = g[col].map({v: i for i, v in enumerate(order)}); g = g.sort_values("k")
        return [{"label": str(r[col]), "policies": int(r["policies"]), "share_pct": num(r["policies"] / n * 100, 1),
                 "claims_per_policy": num(r["claims"] / r["policies"], 2)} for _, r in g.iterrows()]
    return {"empty": False, "policyholders": n, "by_plan": share("plan", ["Bronze", "Silver", "Gold", "Platinum"]), "by_region": share("region"),
            "by_age_group": share("age_group", AGE_LABELS), "by_sex": share("sex"), "cost_drivers": cost_drivers(pol)}


def plans_compare(ds: Dataset, f: Filters) -> dict:
    pol, cl = apply_filters(ds, f)
    if pol.empty:
        return {"empty": True}
    plans = plan_stats(pol, cl)
    k = kpis(pol, cl)
    return {"empty": False, "plans": plans, "portfolio": {"premium": k["premium_collected"], "claims_cost": k["total_charges"],
            "profit": k["provisional_profit"], "loss_ratio": k["loss_ratio"], "avg_charge": k["avg_charge"]},
            "thresholds": {"high_loss_ratio": settings.high_loss_ratio, "efficient_loss_ratio": settings.efficient_loss_ratio},
            "waterfall_note": "Administrative cost is not available in the dataset, so profit = premium - claims only."}


SORTABLE = {"policy_id", "age", "bmi", "charges", "premium", "claim_count", "plan", "region"}


def policies_list(ds: Dataset, f: Filters, page: int, page_size: int, sort_by: str, order: str, q: str | None) -> dict:
    pol, _ = apply_filters(ds, f)
    if q:
        pol = pol[pol["policy_id"].str.contains(q.strip(), case=False, regex=False)]
    pol = pol.sort_values(sort_by, ascending=(order == "asc"), kind="stable")
    total = len(pol)
    page_df = pol.iloc[(page - 1) * page_size: page * page_size]
    flags = outlier_flags(page_df, ds.policies)
    return {"total": total, "page": page, "page_size": page_size, "items": [
        {"policy_id": r.policy_id, "plan": r.plan, "age": int(r.age), "sex": r.sex, "region": r.region, "smoker": r.smoker,
         "bmi": num(r.bmi), "charges": num(r.charges), "premium": num(r.premium), "claim_count": int(r.claim_count), "is_outlier": bool(flags.loc[i])}
        for i, r in zip(page_df.index, page_df.itertuples())]}


def policies_scatter(ds: Dataset, f: Filters) -> dict:
    pol, _ = apply_filters(ds, f)
    flags = outlier_flags(pol, ds.policies)
    d = pol[pol["bmi"].notna()]
    return {"total": int(len(pol)), "unavailable_bmi": int(pol["bmi"].isna().sum()), "points": [
        {"policy_id": r.policy_id, "bmi": num(r.bmi), "charges": num(r.charges), "smoker": r.smoker, "is_outlier": bool(flags.loc[i])}
        for i, r in zip(d.index, d.itertuples())]}


def policy_detail(ds: Dataset, policy_id: str) -> dict | None:
    p = ds.policies
    row = p[p["policy_id"] == policy_id]
    if row.empty:
        return None
    r = row.iloc[0]
    peers = p[(p["plan"] == r["plan"]) & (p["smoker"] == r["smoker"])]
    claims = ds.claims[ds.claims["policy_id"] == policy_id].sort_values("claim_date")
    is_out = bool(outlier_flags(row, p).iloc[0])
    return {
        "policy": {"policy_id": r["policy_id"], "plan": r["plan"], "age": int(r["age"]), "sex": r["sex"], "region": r["region"], "smoker": r["smoker"],
                   "bmi": num(r["bmi"]), "bmi_category": r["bmi_category"], "children": num(r["children"], 0), "charges": num(r["charges"]),
                   "premium": num(r["premium"]), "profit": num(r["premium"] - r["charges"]), "claim_count": int(r["claim_count"]),
                   "avg_turnaround_days": num(r["avg_turnaround_days"], 1), "is_outlier": is_out},
        "peer_comparison": {"label": f"{r['plan']} plan, {'smokers' if r['smoker'] == 'yes' else 'non-smokers'}", "peer_avg_charge": num(peers["charges"].mean()),
                            "peers": int(len(peers)), "vs_peer_pct": num((r["charges"] / peers["charges"].mean() - 1) * 100, 1)},
        "claims": [{"claim_id": c.claim_id, "claim_date": c.claim_date.strftime("%Y-%m-%d"), "processed_date": None if pd.isna(c.processed_date) else c.processed_date.strftime("%Y-%m-%d"),
                    "amount": num(c.amount), "status": c.status, "turnaround_days": num(c.turnaround_days, 0)} for c in claims.itertuples()],
    }


def insights(ds: Dataset, f: Filters) -> dict:
    """Rule-based findings computed from the filtered data. They describe associations, not causes."""
    pol, cl = apply_filters(ds, f)
    limitations = [
        "Plan, premium, claim dates and turnaround are simulated; findings that depend on them are tagged 'Simulated'.",
        "Findings are associations in this dataset and do not establish causes.",
        "Profitability = premium - claims cost; administrative expenses are not included.",
    ]
    findings: list[dict] = []
    if len(pol) < 30:
        return {"findings": findings, "limitations": limitations, "note": "Too few policies (<30) for reliable findings under the current filters."}
    sm = pol.groupby("smoker")["charges"].mean()
    if {"yes", "no"} <= set(sm.index):
        findings.append({"id": "smoker", "severity": "high", "simulated": False, "title": "Smokers cost several times more than non-smokers",
                         "detail": f"Average charges are {sm['yes'] / sm['no']:.1f}x higher for smokers in the selected data.",
                         "evidence": [{"label": "Smoker avg", "value": num(sm["yes"])}, {"label": "Non-smoker avg", "value": num(sm["no"])}]})
    plans = plan_stats(pol, cl)
    if len(plans) > 1:
        worst = max(plans, key=lambda p: p["loss_ratio"]); best = min(plans, key=lambda p: p["loss_ratio"])
        if worst["status"] == "High cost":
            findings.append({"id": "plan-risk", "severity": "high", "simulated": True, "title": f"{worst['plan']} plan needs attention",
                             "detail": f"Claims are {worst['loss_ratio'] * 100:.0f}% of simulated premium, above the {settings.high_loss_ratio * 100:.0f}% threshold.",
                             "evidence": [{"label": "Loss ratio", "value": worst["loss_ratio"]}, {"label": "Provisional profit", "value": worst["profit"]}]})
        findings.append({"id": "plan-efficient", "severity": "info", "simulated": True, "title": f"{best['plan']} is the most cost-efficient plan",
                         "detail": f"Lowest loss ratio among the plans shown ({best['loss_ratio'] * 100:.0f}% of simulated premium).",
                         "evidence": [{"label": "Loss ratio", "value": best["loss_ratio"]}, {"label": "Avg charge", "value": best["avg_charge"]}]})
    ages = pol.groupby("age_group")["charges"].mean()
    if len(ages) > 1:
        top, low = ages.idxmax(), ages.idxmin()
        findings.append({"id": "age", "severity": "medium", "simulated": False, "title": f"Average charges peak in the {top} age group",
                         "detail": f"{top} averages {ages[top] / ages[low]:.1f}x the {low} group.",
                         "evidence": [{"label": f"{top} avg", "value": num(ages[top])}, {"label": f"{low} avg", "value": num(ages[low])}]})
    ranked = pol.sort_values("charges", ascending=False)
    top_n = max(1, int(round(len(pol) * 0.1)))
    share = ranked.head(top_n)["charges"].sum() / pol["charges"].sum() * 100
    findings.append({"id": "concentration", "severity": "medium", "simulated": False, "title": "Costs are concentrated in a small group",
                     "detail": f"The top 10% of policyholders ({top_n}) account for {share:.0f}% of total charges.",
                     "evidence": [{"label": "Share of charges", "value": num(share, 1)}, {"label": "Policyholders", "value": top_n}]})
    ta = [p for p in plans if p["avg_turnaround_days"] is not None]
    if len(ta) > 1:
        slow = max(ta, key=lambda p: p["avg_turnaround_days"]); fast = min(ta, key=lambda p: p["avg_turnaround_days"])
        findings.append({"id": "turnaround", "severity": "medium", "simulated": True, "title": f"Claims on {slow['plan']} take longest to process",
                         "detail": f"{slow['avg_turnaround_days']} days on average vs {fast['avg_turnaround_days']} days on {fast['plan']} (processed claims only).",
                         "evidence": [{"label": f"{slow['plan']} avg days", "value": slow["avg_turnaround_days"]}, {"label": f"{fast['plan']} avg days", "value": fast["avg_turnaround_days"]}]})
    return {"findings": findings, "limitations": limitations, "note": None}


def meta(ds: Dataset) -> dict:
    from app.data.loader import SIMULATED_FIELDS
    p = ds.policies
    return {"dataset": ds.source, "is_synthetic": ds.is_synthetic, "simulated_fields": SIMULATED_FIELDS, "quality_report": ds.report,
            "policies": int(len(p)), "claims": int(len(ds.claims)),
            "claims_window": {"from": ds.claims["claim_date"].min().strftime("%Y-%m-%d"), "to": ds.claims["claim_date"].max().strftime("%Y-%m-%d"), "as_of": settings.data_as_of},
            "thresholds": {"high_loss_ratio": settings.high_loss_ratio, "efficient_loss_ratio": settings.efficient_loss_ratio, "outlier_z": settings.outlier_z}}
