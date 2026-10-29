from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.data.loader import get_dataset
from app.schemas.filters import Filters, get_filters
from app.services import analytics as A

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    ds = get_dataset()
    return {"status": "ok", "policies": len(ds.policies), "claims": len(ds.claims)}


@router.get("/meta")
def meta():
    return A.meta(get_dataset())


@router.get("/filters")
def filters():
    return A.filter_options(get_dataset())


@router.get("/overview")
def overview(f: Filters = Depends(get_filters)):
    return A.overview(get_dataset(), f)


@router.get("/claims")
def claims(f: Filters = Depends(get_filters)):
    return A.claims_view(get_dataset(), f)


@router.get("/claims/ledger")
def claims_ledger(f: Filters = Depends(get_filters), page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
                  status: Optional[Literal["Processed", "Pending"]] = None):
    return A.claims_ledger(get_dataset(), f, page, page_size, status)


@router.get("/utilization")
def utilization(f: Filters = Depends(get_filters)):
    return A.utilization(get_dataset(), f)


@router.get("/plans/compare")
def plans_compare(f: Filters = Depends(get_filters)):
    return A.plans_compare(get_dataset(), f)


@router.get("/policies")
def policies(f: Filters = Depends(get_filters), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
             sort_by: str = Query("charges"), order: Literal["asc", "desc"] = "desc", q: Optional[str] = Query(None, max_length=20)):
    if sort_by not in A.SORTABLE:
        raise HTTPException(422, f"sort_by must be one of {sorted(A.SORTABLE)}")
    return A.policies_list(get_dataset(), f, page, page_size, sort_by, order, q)


@router.get("/policies/scatter")
def policies_scatter(f: Filters = Depends(get_filters)):
    return A.policies_scatter(get_dataset(), f)


@router.get("/policies/{policy_id}")
def policy_detail(policy_id: str):
    d = A.policy_detail(get_dataset(), policy_id)
    if d is None:
        raise HTTPException(404, f"Policy {policy_id} not found")
    return d


@router.get("/insights")
def insights(f: Filters = Depends(get_filters)):
    return A.insights(get_dataset(), f)
