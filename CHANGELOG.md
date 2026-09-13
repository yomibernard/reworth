# Changelog

## v1.2-intelligence — 2026-09-13

### Added
- Saved-search alerts (15-min scheduler, dedupe, PRD §28 batch wording, pause + 9am WAT digest)
- Recommendations v2 (WeightedRecProvider, feature store, city-scoped) + A/B `rec_home_v2`
- Surfaces: home Recommended, PDP Similar items, post-checkout “You might also like”
- Valuation v2 sold-data comps + cold-start fallback; weekly model-refresh reports
- Seller analytics API + `/sell/analytics` dashboard + CSV (no buyer PII)
- Docs: EXPERIMENTS.md, METRICS.md, ADR-004 RecProvider
- Tests: alerts dedupe, rec determinism + city scope, valuation fixtures, seller metrics

## v1.1-moving-communities — 2026-09-13

### Added
- Moving Sales: collections, follow, deadline expiry → COMPLETED, home rail, analytics events
- Estate Communities: privacy matrix, invite codes, membership queue, CommunityManager scope
- Listings/search visibility gating (private → 404-equivalent, no access leaks)
- Web: moving sale pages, communities browse/detail, My Communities, sell communityOnly
- Admin Communities page: CRUD fields, membership approve/reject/suspend, managers
- Mobile thin helpers + PDP chips; seeds for VGC, Banana Island, Lekki Ph1, Eko Atlantic, Corporate/Church/Alumni
- Tests: gating matrix, invites, moving totals, estate-manager scope, 404-leak
- RBAC: Estate Manager (CommunityManager) scoped permissions

## v1.0-swap — 2026-09-13

### Added
- Swap proposals (item + optional cash) with accept/reject/counter/withdraw; 72h expiry
- Give-away claims with L2+ gate, single-winner approve, claim expiry
- Order `transactionType` + dual-leg fulfilment; ADR-003 failure/reversal
- Web PDP Swap / Claim CTAs, proposal modal, seller claims review
- Mobile Swap sheet + Claim CTA
- Tests: pure swap (no payment calls), swap+cash, counters, giveaway race

## v0.9.0-rc — 2026-09-13

Release candidate for ReWorth MVP (Lagos recommerce).

### Added
- Phase 10 UAT, demo, launch, runbook docs
- Staging seed + Playwright/Maestro golden paths
- MVP §50 status table; Phase 2/3 backlog

### Known gaps
- Expo push mock-only; staging k6 certification; pen-test / NDPR / store sign-offs
