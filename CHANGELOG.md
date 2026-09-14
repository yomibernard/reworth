# Changelog

## v2.2-monetization — 2026-09-14

### Added
- RevenueLine ledger (all PRD §34 streams) + versioned FeeConfig; order/capture + boost/featured/sub/consign/inspection/auth writers
- Nightly reconciliation → Finance alerts; admin `/finance` summary + recon
- Seller self-serve (mobile-first): Boost / Featured / Seller Plus; browse ranking prefers featured/boosted
- Premium community flags (admin PATCH); ADR-009 promoted search admin-only
- Docs: `BUYER_JOURNEY_AUDIT.md`, METRICS finance section; Maestro `05_boost_listing.yaml`
- Tests: fee math, ledger, boost idempotency, subscription lifecycle, recon inject, finance fixtures

## Unreleased — Mobile · Store · Ops

### Added
- Mobile: Ask / Worth / Room scan / Consign / Pickup tools on Expo home (`PlatformTools`)
- `ExpoPushProvider` (`PUSH_PROVIDER=expo`) + mobile device token register; `eas.json` stubs
- Ibadan region config; NDPR checklist; `scripts/k6/smoke.js`; track doc `MOBILE_STORE_OPS_TRACK.md`

## v2.1-expansion — 2026-09-13

### Added
- Region config layer (`config/regions/*`) for Lagos, Abuja, Port Harcourt; config-only city proof + CITY_PLAYBOOK
- Corporate relocation workspace (Persona C 12-item flow, moving sale, completion report + invoice)
- Estate partner API-key auth + signed webhooks (replay-safe) + partner console
- Circular hand-offs (charity/recycler) + donate-if-unsold; ADRs 007 (cross-border design) / 008 (region)
- Admin corporate + partners; tests (13) + `scripts/validate-city-config.mjs`

## v2.0-ai-assistant — 2026-09-13

### Added
- Ask ReWorth assistant (tools, confirm-gated mutations, audit logs, degrade-to-search)
- Budget bundles (city-scoped, ≤ budget, shareable); room scan mock → 6 drafts (idempotent)
- Valuation product; Instant Buy fulfilment + 48h SLA auto-refund; consignment fee split; managed pickup (WAT)
- Web: `/ask`, `/room-scan`, `/worth`, `/consign`, `/pickup`; Instant Buy badge; ADR-006
- Tests: 18 (assistant intents, bundles, room-scan, IB SLA, consign fee, pickup slots)

## v1.3-verticals — 2026-09-13

### Added
- Vehicle inspection: InspectionProvider + mock, fee/PSP, report webhook, Inspected ✓ / dated badge, dispute link
- Luxury authentication: `IN_AUTHENTICATION` order status, Authentic ✓ / Unauthenticated, auth-fail refund idempotent
- Pro sellers: apply/approve, subscription grace/suspend, CSV bulk (max 50), storefront `/u/[handle]`
- Referrals: codes, attribution, FREE_BOOST reward, self/device anti-abuse, admin ledger
- Web/admin/mobile surfaces; ADR-005; tests for inspection/auth/pro/referral (9)

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
