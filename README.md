# Healthcare Insurance Cost Analysis Dashboard

Custom web implementation (React + TypeScript + Vite + Tailwind + Recharts / FastAPI + Pandas) of the PRD, styled per the Design Spec.
The PRD names Power BI as the original platform; this follows the supplied Tech Stack document instead. **Confirm that change with your guide** (no `.pbix` is produced).

## Data: read this first
- No real dataset was available when this was built, so the backend generates **synthetic demonstration data** (1,338 rows, Kaggle-style schema). It is not real insurance data. The UI says so.
- To use the real file, put `insurance.csv` in `data/raw/` and restart the backend. It is cleaned (duplicates, invalid values) and used as-is.
- The public datasets have no plan, premium, claims or dates. Those are **simulated** (fixed seed, reproducible) and tagged "Simulated" in the UI: plan, premium, claim dates/processing dates, per-claim amounts (they sum exactly to each policy's `charges`), turnaround.
- Claims window: 2025-11-01 to 2026-10-31, as-of 2026-10-31. Claims not yet processed by the as-of date are "Pending" and have **no** turnaround (shown as N/A, excluded from averages, never counted as 0).

## Run
```bash
# Backend  (http://localhost:8000, docs at /docs)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000

# Frontend (http://localhost:5173)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm install
npm run dev
```
Tests: `cd backend && python -m pytest -q` · Frontend checks: `cd frontend && npm run typecheck && npm run build`

## Structure
```
backend/app/{api,core,data,schemas,services}   routes, settings, loading/cleaning/simulation, filter validation, shared analytics
backend/tests                                   pytest + HTTPX/TestClient
frontend/src/{components,pages,hooks,services,types,utils}
data/raw (never modified)   data/processed (generated)
```
No database is used: the Tech Stack allows reading cleaned files for a prototype. PostgreSQL/SQLAlchemy/Alembic and Docker are **not implemented**.

## API
`GET /api/health, /meta, /filters, /overview, /claims, /claims/ledger, /utilization, /plans/compare, /policies, /policies/scatter, /policies/{id}, /insights`
Filters on all analytic endpoints: `plan, region, age_group, smoker`. Invalid values return 422; unknown policy 404.

## Definitions (provisional where the PRD says "assumption")
- Total charges = sum of `charges`; average charge = total / policyholders; claim frequency = claims / policyholders over the 12-month window.
- Turnaround = processed date - claim date, processed claims only.
- Provisional profit = premium - claims cost (no admin cost). Loss ratio = claims cost / premium.
- High-cost plan: loss ratio > 100%. Cost-efficient: <= 80%. Outlier policy: charges > 2.5 SD above the mean of the same smoker group. **These thresholds are my choice; the PRD asks for them to be confirmed.**
- All KPIs come from one backend analytics module, so cards, charts and tables agree.

## PRD coverage
| PRD | Status |
|---|---|
| FR-1/2/3 ingest, clean, model | Done (CSV/Excel; dedupe, validation, derived fields); no star schema, flat tables |
| FR-4 KPI cards | Done |
| FR-5 claim frequency/cost | Done |
| FR-6 turnaround | Done (simulated) |
| FR-7 enrollment, utilization | Done |
| FR-8, FR-9 plan comparison, high-cost/efficient | Done (simulated premium) |
| FR-10 filters | Done (plan, region, age group, smoker) |
| FR-11 drill-down plan -> policy -> claim | Done |
| FR-12 detail tables | Done (policies, claims ledger) |
| FR-13 cost drivers | Done |
| FR-14 insights | Done (rule-based) |
| FR-15 export/share | **Not done** (P2) |

## Not built from the Design Spec
Blueprint intro and 3D exploded outro, cursor demo, caption pill, donut gauges, risk-review screen, premium scenario table (Low/Base/High), report-published screen, "Flag for review / Keep as is" buttons (no persistence layer, so they would be fake), notifications/avatars, and the Claims/Premiums/Cost-drivers/Plan-risk/Data-quality/Reports nav items as separate pages (their content lives in the six pages that exist). Count-up, bar growth, line draw, drawer, tooltips and reduced-motion handling are implemented.
# health_insurance
