# Phase 3.3 — Monetization & Marketplace Economics

Tag: `v2.2-monetization` · PRD §34–36 · Mobile-first

## Build order

1. Schema: RevenueLine, FeeConfigVersion, SellerSubscription, FinanceAlert; extend Promotion + Community premium
2. FeeConfigService (versioned) + RevenueLedgerService (one line per fee)
3. Wire payment capture → protection_fee + delivery_margin
4. Seller boost / featured purchase (PSP) + Plus subscription lifecycle
5. Reconciliation nightly job + Finance alerts
6. Mobile self-serve (boost ≤1 min, Plus) → web parity tracked in MOBILE_PARITY
7. Admin finance dashboard + fee config
8. Tests, METRICS.md, buyer-journey audit, Maestro stub

## ADRs

- `009-promoted-search-admin.md` — promoted slots admin-assigned for now
