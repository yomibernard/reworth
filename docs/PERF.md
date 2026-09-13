# Performance — Phase 9 (`v0.9-risk-security`)

## Targets

| Surface | Budget |
| --- | --- |
| API p95 (k6, 500 VUs) | **&lt; 500ms** |
| Web Lighthouse performance | ≥ 80 |
| Web LCP (3G sim) | &lt; 3s on home / listing / search |

## k6 scripts

| Script | Purpose |
| --- | --- |
| [`infra/k6/mixed-load.js`](../infra/k6/mixed-load.js) | Mixed home/search/listings + health (arrival-rate, 500 VUs) |
| [`infra/k6/phase9-500vu-gate.js`](../infra/k6/phase9-500vu-gate.js) | Hot-path gate (health/categories/readyz × 500 VUs) |
| [`infra/k6/results-phase9-summary.json`](../infra/k6/results-phase9-summary.json) | Latest local summary export |

```bash
# Prefer cloud staging. Local: DISABLE_THROTTLE=1 on API.
k6 run -e API_BASE_URL=https://staging.example/api/v1 infra/k6/phase9-500vu-gate.js
k6 run -e API_BASE_URL=https://staging.example/api/v1 infra/k6/mixed-load.js
```

### Local staging-shaped runs (2026-09-13)

Hardware: single Nest process on Windows laptop, Postgres available, Redis offline (memory home cache), `DISABLE_THROTTLE=1`.

| Run | VUs | Outcome |
| --- | --- | --- |
| Gate (health/categories) | 500 | Healthy responses **med ~62ms**; overall p95 inflated by saturated 5xx/timeouts under unconstrained concurrency — **does not meet budget on this host** |
| Mixed arrival-rate | 500 | Same saturation pattern when DB routes included |

**Verdict:** Scripts and budgets are committed. Local single-node cannot honestly claim p95 &lt; 500ms at 500 open VUs. **Cloud staging (multi-instance / proper pool + Redis) is the AC environment** — re-run and overwrite `results-phase9-summary.json` in Phase 10 UAT. Until then, treat the gate as a **pass when staging shows p95 &lt; 500ms**.

### Top 3 offenders fixed (local)

| # | Hotspot | Fix |
| --- | --- | --- |
| 1 | Rate-limit 429 storm | `DISABLE_THROTTLE` for load tests; `SkipThrottle` on health; named throttles for auth/search/upload |
| 2 | Home 200-row rails + Redis crash | Cap 60 rows; Redis errors → memory cache (no process abort) |
| 3 | Browse page size | Default 20 / max 50 |

## Lighthouse CI

Config: `apps/web/lighthouserc.js` — performance ≥ 80, LCP &lt; 3000ms.

```bash
pnpm --filter @reworth/web lhci
```
