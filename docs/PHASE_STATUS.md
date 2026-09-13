# Phase status

| Field | Value |
| --- | --- |
| Current phase | **2.3 — Intelligence** |
| Prompt | Post-launch 2.3 |
| Target tag | `v1.2-intelligence` |
| Status | **Complete (pending PR merge)** |
| Last completed | **2.3** web UI + docs (API intelligence module on same branch) |
| Last updated | 2026-09-13 |

## What exists (through 2.3)
- Saved-search alerts model (`paused`, `digestEnabled`); web My → Searches pause/digest/delete
- Recommendations surfaces: home (JWT), PDP similar, post-checkout also-like
- Price intelligence extended fields + confidence label on sell/PDP
- Seller analytics page + CSV export; METRICS + EXPERIMENTS docs; ADR-004 RecProvider
- Feature/experiment/valuation schema tables (city-scoped)

## Resume
After PR merge + tag `v1.2-intelligence`, start Prompt 2.4 Verticals (`v1.3`).
