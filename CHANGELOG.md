# Changelog

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
