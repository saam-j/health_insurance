"""Shared filter parameters (validated against the values present in the data)."""
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Query

from app.data.loader import get_dataset


@dataclass
class Filters:
    plan: Optional[str] = None
    region: Optional[str] = None
    age_group: Optional[str] = None
    smoker: Optional[str] = None  # "yes" | "no"


def get_filters(
    plan: Optional[str] = Query(None, description="Plan name"),
    region: Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
    smoker: Optional[str] = Query(None, description="yes or no"),
) -> Filters:
    p = get_dataset().policies
    allowed = {
        "plan": set(p["plan"].unique()),
        "region": set(p["region"].unique()),
        "age_group": set(p["age_group"].unique()),
        "smoker": {"yes", "no"},
    }
    values = {"plan": plan, "region": region, "age_group": age_group, "smoker": smoker}
    for key, val in values.items():
        if val not in (None, "") and val not in allowed[key]:
            raise HTTPException(status_code=422, detail=f"Invalid {key}: {val!r}. Allowed: {sorted(allowed[key])}")
    return Filters(**{k: (v or None) for k, v in values.items()})
