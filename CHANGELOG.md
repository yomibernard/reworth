# Changelog

## v0.9.0-rc — 2026-09-13

Release candidate for ReWorth MVP (Lagos recommerce).

### Added
- Phase 10 UAT checklist (`docs/UAT.md`), demo script (`docs/DEMO.md`), launch checklist (`docs/LAUNCH.md`), incident runbook (`docs/RUNBOOK.md`)
- Staging seed `pnpm seed:staging` (~300 users, ~2000 listings, demo Ori/Ayo/Risk)
- Playwright golden-path e2e + Maestro mobile stubs
- MVP §50 status table (`docs/MVP_STATUS.md`); Phase 2/3 backlog (`docs/BACKLOG_PHASE2.md`)

### Included from prior phases
- Auth, listings, discovery, chat/offers, escrow orders, logistics, notifications, trust, admin portal, risk/moderation, security/privacy docs

### Known gaps
- Expo/FCM/APNs push mock-only  
- Admin TOTP policy optional  
- Staging k6 p95 certification pending  
- httpOnly cookie session transport deferred  
- External pen-test, NDPR counsel, store submissions pending  

See `docs/MVP_STATUS.md` and `docs/LAUNCH.md`.
