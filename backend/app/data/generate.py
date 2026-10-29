"""Synthetic demonstration data generator.

Used ONLY when no real dataset is found at data/raw/insurance.csv. The schema mirrors the public
"Medical Cost Personal Insurance" Kaggle dataset (age, sex, bmi, children, smoker, region, charges),
but every value here is synthetic and must never be presented as real-world insurance statistics.
"""
import numpy as np
import pandas as pd

REGIONS = ["northeast", "northwest", "southeast", "southwest"]


def generate_synthetic_base(n: int = 1338, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    age = rng.integers(18, 65, n)
    sex = rng.choice(["female", "male"], n)
    bmi = np.clip(rng.normal(30.6, 6.1, n), 15.9, 53.1).round(2)
    children = np.clip(rng.poisson(1.1, n), 0, 5)
    smoker = rng.choice(["yes", "no"], n, p=[0.2, 0.8])
    region = rng.choice(REGIONS, n, p=[0.24, 0.24, 0.27, 0.25])
    base = 600 + 150 * age + 250 * children + 90 * (bmi - 25).clip(min=0)
    smoke_extra = np.where(smoker == "yes", 22000 + 600 * (bmi - 30).clip(min=0), 0)
    region_f = pd.Series(region).map({"northeast": 1.06, "northwest": 1.0, "southeast": 0.97, "southwest": 0.95}).to_numpy()
    charges = ((base + smoke_extra) * region_f * rng.lognormal(0, 0.28, n)).clip(min=1121).round(2)
    return pd.DataFrame(dict(age=age, sex=sex, bmi=bmi, children=children, smoker=smoker, region=region, charges=charges))
