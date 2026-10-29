import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.data.loader import clean, get_dataset
from app.main import app

client = TestClient(app)
ds = get_dataset()


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_overview_kpis_reconcile_with_data():
    k = client.get("/api/overview").json()["kpis"]
    assert k["policyholders"] == len(ds.policies)
    assert k["total_charges"] == pytest.approx(ds.policies["charges"].sum(), abs=0.01)
    assert k["avg_charge"] == pytest.approx(ds.policies["charges"].mean(), abs=0.01)
    assert k["claim_count"] == len(ds.claims)


def test_claim_amounts_reconcile_to_policy_charges():
    sums = ds.claims.groupby("policy_id")["amount"].sum()
    merged = ds.policies.set_index("policy_id")["charges"]
    assert (sums - merged).abs().max() < 0.01


@pytest.mark.parametrize("plan", ["Bronze", "Silver", "Gold", "Platinum"])
def test_filter_consistent_across_endpoints(plan):
    ov = client.get("/api/overview", params={"plan": plan}).json()["kpis"]
    cmp_ = client.get("/api/plans/compare", params={"plan": plan}).json()["plans"]
    expected = ds.policies[ds.policies["plan"] == plan]["charges"].sum()
    assert ov["total_charges"] == pytest.approx(expected, abs=0.01)
    assert len(cmp_) == 1 and cmp_[0]["claims_cost"] == pytest.approx(expected, abs=0.01)


def test_plan_totals_sum_to_portfolio():
    plans = client.get("/api/plans/compare").json()["plans"]
    assert sum(p["claims_cost"] for p in plans) == pytest.approx(ds.policies["charges"].sum(), abs=0.05)


def test_combined_filters_match_pandas():
    r = client.get("/api/overview", params={"smoker": "yes", "region": "southeast", "age_group": "40-49"}).json()["kpis"]
    p = ds.policies
    sub = p[(p.smoker == "yes") & (p.region == "southeast") & (p.age_group == "40-49")]
    assert r["policyholders"] == len(sub)


def test_empty_selection_is_flagged_not_zeroed():
    # A combination that may be empty must return empty=True or valid data, never an error
    r = client.get("/api/overview", params={"plan": "Bronze", "age_group": "60+", "smoker": "yes", "region": "northwest"})
    assert r.status_code == 200
    body = r.json()
    if body["empty"]:
        assert body["kpis"]["avg_charge"] is None


def test_invalid_filter_rejected():
    assert client.get("/api/overview", params={"plan": "Diamond"}).status_code == 422
    assert client.get("/api/policies", params={"sort_by": "password"}).status_code == 422
    assert client.get("/api/policies", params={"page_size": 5000}).status_code == 422


def test_policy_detail_and_404():
    r = client.get("/api/policies/P-0001")
    assert r.status_code == 200 and r.json()["policy"]["policy_id"] == "P-0001"
    assert sum(c["amount"] for c in r.json()["claims"]) == pytest.approx(r.json()["policy"]["charges"], abs=0.01)
    assert client.get("/api/policies/P-9999").status_code == 404


def test_pending_turnaround_is_unavailable_not_zero():
    pending = ds.claims[ds.claims.status == "Pending"]
    assert len(pending) > 0 and pending["turnaround_days"].isna().all()


def test_policies_pagination_and_search():
    r = client.get("/api/policies", params={"page_size": 5, "q": "P-000"}).json()
    assert len(r["items"]) == 5 and r["total"] == 9


def test_insights_have_evidence():
    for f in client.get("/api/insights").json()["findings"]:
        assert f["evidence"] and f["detail"]


def test_clean_removes_duplicates_and_invalid():
    raw = pd.DataFrame({
        "age": [30, 30, 40, 200, 25], "sex": ["Male", "Male", "female", "male", "female"], "bmi": [25.0, 25.0, None, 30.0, 22.0],
        "children": [1, 1, 0, 0, 2], "smoker": ["no", "no", "YES", "no", "no"], "region": ["northeast"] * 5, "charges": [5000, 5000, 9000, 4000, -5],
    })
    out, report = clean(raw)
    assert report["duplicates_removed"] == 1
    assert report["rows_dropped_invalid"] == 2  # age 200 and negative charges
    assert len(out) == 2
    assert out.loc[out.age == 40, "bmi"].isna().all()  # missing BMI stays unavailable
    assert set(out.smoker) == {"no", "yes"}


def test_clean_rejects_missing_columns():
    with pytest.raises(ValueError):
        clean(pd.DataFrame({"age": [1]}))
