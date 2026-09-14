# Phase status

| Field | Value |
| --- | --- |
| Current | **Post-launch complete through 3.3** |
| Last completed phase | **3.3 — Monetization** `v2.2-monetization` |
| Status | **Shipped** |
| Last updated | 2026-09-14 |

## Phase 3.3 summary

- RevenueLine ledger + versioned FeeConfig + reconciliation → Finance alerts
- Seller self-serve (mobile-first): Boost / Featured / Seller Plus
- Admin `/finance` dashboard (streams × city, take rate, MRR, recon)
- Docs: `METRICS.md`, `BUYER_JOURNEY_AUDIT.md`, ADR-009
- Web Boost/Plus companion tracked in `MOBILE_PARITY.md`

## Resume

City launches via `docs/CITY_PLAYBOOK.md` (config-only). Close remaining `MOBILE_PARITY.md` rows. Cross-border remains design-only (ADR-007).

## MVP residual harden (no retag)

- **Phase 9 risk/security** — `docs/PHASE_9_HARDENING.md` (appeals UX, fraud explainability, risk engine HIGH-path test). Tag `v0.9-risk-security` unchanged. Staging k6 p95 certification → UAT (`docs/PERF.md`).
- **Phase 8 admin** — `docs/PHASE_8_HARDENING.md`. Tag `v0.8-admin` unchanged.
- **Phase 6 logistics** — `docs/PHASE_6_HARDENING.md`. Tag `v0.6-logistics-notifications` unchanged.
- Phase 4 chat harden already on default branch (PR #18).
