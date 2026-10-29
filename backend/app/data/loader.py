"""Data ingestion, cleaning and (clearly labelled) simulation of fields the public datasets lack.

Real fields (from the source file):      age, sex, bmi, children, smoker, region, charges
Simulated fields (deterministic seed):   plan, premium, and the whole claims table
(claim dates, processing dates, per-claim amounts). Per-claim amounts always sum to the policy's `charges`.
policy_id is assigned from row order after cleaning.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
import pandas as pd

from app.core.config import settings
from app.data.generate import generate_synthetic_base

REQUIRED = ["age", "sex", "bmi", "children", "smoker", "region", "charges"]
PLANS = ["Bronze", "Silver", "Gold", "Platinum"]
PLAN_BASE_PREMIUM = {"Bronze": 6900, "Silver": 8650, "Gold": 11000, "Platinum": 14350}
AGE_BINS = [17, 29, 39, 49, 59, 200]
AGE_LABELS = ["18-29", "30-39", "40-49", "50-59", "60+"]
SIMULATED_FIELDS = ["plan", "premium", "claim dates", "claim processing dates", "per-claim amounts", "turnaround days"]


@dataclass
class Dataset:
    policies: pd.DataFrame
    claims: pd.DataFrame
    source: str
    is_synthetic: bool
    report: dict = field(default_factory=dict)


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Validate columns, drop duplicates/invalid rows, standardise formats. Returns (clean_df, report)."""
    df = raw.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing_cols = [c for c in REQUIRED if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")
    df = df[REQUIRED].copy()
    report = {"rows_read": int(len(df)), "missing_values_before": {c: int(df[c].isna().sum()) for c in REQUIRED}}

    for c in ["sex", "smoker", "region"]:
        df[c] = df[c].astype("string").str.strip().str.lower()
    for c in ["age", "bmi", "children", "charges"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    report["duplicates_removed"] = int(before - len(df))

    # Rows lacking a core field cannot be analysed; BMI/children gaps stay NaN (unavailable), never zero.
    core_missing = df[["age", "sex", "smoker", "region", "charges"]].isna().any(axis=1)
    invalid = ((df["age"] < 0) | (df["age"] > 120) | (df["charges"] <= 0)
               | ~df["smoker"].isin(["yes", "no"]) | (df["bmi"].notna() & ((df["bmi"] < 10) | (df["bmi"] > 80))))
    invalid = invalid.fillna(False).astype(bool)
    report["rows_dropped_missing_core"] = int(core_missing.sum())
    report["rows_dropped_invalid"] = int((invalid & ~core_missing).sum())
    df = df[~(core_missing | invalid)].reset_index(drop=True)
    df["age"] = df["age"].astype(int)
    for c in ["sex", "smoker", "region"]:
        df[c] = df[c].astype(str)
    df["age_group"] = pd.cut(df["age"], AGE_BINS, labels=AGE_LABELS).astype(str)
    cat = pd.cut(df["bmi"], [0, 18.5, 25, 30, 200], labels=["Underweight", "Normal", "Overweight", "Obese"], right=False)
    df["bmi_category"] = cat.astype(object).where(df["bmi"].notna(), "Unknown")
    df.insert(0, "policy_id", [f"P-{i + 1:04d}" for i in range(len(df))])
    report["rows_final"] = int(len(df))
    return df, report


def simulate(df: pd.DataFrame, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Add simulated plan/premium and build the simulated claims table (see module docstring)."""
    rng = np.random.default_rng(seed)
    n = len(df)
    # Adverse selection: older and smoking members lean toward richer plans.
    w = np.tile(np.array([0.34, 0.30, 0.22, 0.14]), (n, 1))
    older = df["age"].to_numpy() >= 50
    smoker = df["smoker"].to_numpy() == "yes"
    w[older] *= np.array([0.6, 0.9, 1.4, 1.8])
    w[smoker] *= np.array([0.5, 0.8, 1.5, 1.9])
    w /= w.sum(axis=1, keepdims=True)
    plan = np.array([rng.choice(PLANS, p=p) for p in w])
    age_factor = 1 + 0.012 * (df["age"].to_numpy() - 18)
    premium = np.array([PLAN_BASE_PREMIUM[p] for p in plan]) * age_factor * np.where(smoker, 1.5, 1.0)
    pol = df.copy()
    pol["plan"] = plan
    pol["premium"] = premium.round(2)

    as_of = pd.Timestamp(settings.data_as_of)
    start = pd.Timestamp("2025-11-01")
    span_days = (as_of - start).days
    speed = {"Bronze": 1.25, "Silver": 1.1, "Gold": 0.95, "Platinum": 0.8}
    rows = []
    for i, r in enumerate(pol.itertuples(index=False)):
        k = int(np.clip(1 + rng.poisson(r.charges / 7000), 1, 12))
        amounts = np.round(rng.dirichlet(np.ones(k)) * r.charges, 2)
        amounts[-1] = round(r.charges - amounts[:-1].sum(), 2)  # exact reconciliation to policy charges
        dates = start + pd.to_timedelta(rng.integers(0, span_days + 1, k), unit="D")
        days = np.maximum(1, np.round(rng.lognormal(np.log(10), 0.55, k) * speed[r.plan] * (1 + amounts / 40000))).astype(int)
        for j in range(k):
            processed = dates[j] + pd.Timedelta(days=int(days[j]))
            done = processed <= as_of
            rows.append((f"C-{i + 1:04d}-{j + 1:02d}", r.policy_id, dates[j], processed if done else pd.NaT,
                         float(amounts[j]), "Processed" if done else "Pending", float(days[j]) if done else np.nan))
    claims = pd.DataFrame(rows, columns=["claim_id", "policy_id", "claim_date", "processed_date", "amount", "status", "turnaround_days"])
    claims["month"] = claims["claim_date"].dt.strftime("%Y-%m")
    agg = claims.groupby("policy_id").agg(claim_count=("claim_id", "count"), avg_turnaround_days=("turnaround_days", "mean"))
    pol = pol.merge(agg, on="policy_id", how="left")
    return pol, claims


@lru_cache(maxsize=1)
def get_dataset() -> Dataset:
    csv, xlsx = settings.raw_dir / "insurance.csv", settings.raw_dir / "insurance.xlsx"
    if csv.exists():
        raw, source, synthetic = pd.read_csv(csv), "insurance.csv (user-supplied source file)", False
    elif xlsx.exists():
        raw, source, synthetic = pd.read_excel(xlsx), "insurance.xlsx (user-supplied source file)", False
    else:
        raw, source, synthetic = generate_synthetic_base(), "Synthetic demonstration data (generated; not real insurance statistics)", True
    cleaned, report = clean(raw)
    pol, claims = simulate(cleaned)
    settings.processed_dir.mkdir(parents=True, exist_ok=True)  # raw files are never modified
    pol.to_csv(settings.processed_dir / "policies.csv", index=False)
    claims.to_csv(settings.processed_dir / "claims.csv", index=False)
    return Dataset(pol, claims, source, synthetic, report)
