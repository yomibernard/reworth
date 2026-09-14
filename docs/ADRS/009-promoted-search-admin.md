# ADR-009: Promoted search placements (admin-assigned)

- **Status:** Accepted
- **Date:** 2026-09-14
- **Deciders:** Product, Backend Lead (Phase 3.3)

## Context

PRD §34 lists promoted listings as a revenue stream. Self-serve bidding for search slots needs ranking/auction design and fraud controls not ready for MVP monetization.

## Decision

1. `PromotionKind.PROMOTED` exists for fixed search-result slots.
2. **Admin-assigned only** in `v2.2-monetization` (create via admin promotions API).
3. Seller self-serve for promoted placements is **deferred** to a later phase; Boost + Featured remain seller self-serve.
4. Each promoted assignment still writes a `RevenueLine` (`promoted`) when fee > 0 (may be deferred/`pspReference` null until invoiced).

## Consequences

- Search ranking reads active PROMOTED promotions for fixed slots.
- MOBILE_PARITY tracks promoted self-serve as missing / deferred.
