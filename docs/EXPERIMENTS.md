# Experiments — ReWorth A/B framework

Phase 2.3 (`v1.2-intelligence`). Minimal but real bucketing for ranking experiments.

## Bucketing

- **Stable assignment:** `bucket = hash(userId + ":" + experimentKey) % 100` (unsigned 32-bit FNV-1a or equivalent).
- Assignment is **sticky** per `(experimentId, userId)` via `ExperimentAssignment`.
- `trafficPct` (0–100) gates exposure: if `bucket >= trafficPct`, user stays on implicit control and is not assigned.
- Anonymous visitors are not bucketed; they receive popularity / non-personalised rails.

## Seed experiment: `rec_home_v2`

| Field | Value |
| --- | --- |
| Key | `rec_home_v2` |
| Variants | `control` · `weighted_v2` |
| Surface | Home “Recommended for You” rail |
| Default traffic | 100% |

- **control** — legacy popularity / v1 heuristic ranking.
- **weighted_v2** — `WeightedRecProvider` (recency, category/brand/price similarity, community affinity, seller trust), city-hard-filtered.

Similar (`surface=similar`) and post-checkout (`surface=post_checkout`) use the provider without this experiment key unless extended later.

## Metric attribution

Events written to `ExperimentMetric`:

| Event | When | `listingId` |
| --- | --- | --- |
| `impression` | Rec rail / card rendered (optional client beacon) | yes |
| `click` | User opens a recommended listing | yes |
| `ctr` | Derived: clicks / impressions per variant | — |
| `conversion` | Buyer completes order for a listing seen via rec (same session or 7d attribution window) | yes |

**CTR** = `count(click) / count(impression)` per `(experiment, variant)`.

**Conversion** = `count(conversion) / count(click)` (or vs impressions — document which in admin export).

City is **not** a variant axis; experiments are evaluated **within city** when slicing (Lagos vs Abuja never mixed).

## Client notes

- Web home passes JWT to `GET /home` so the API can assign `rec_home_v2` and personalise.
- Explicit `GET /recommendations?surface=…` may return `experimentKey` + `variant` for debugging.

## Ops

- Toggle `Experiment.active` or lower `trafficPct` to pause.
- Do not delete historical `ExperimentMetric` rows — append-only.
