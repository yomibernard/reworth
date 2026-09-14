# ADR-007: Cross-border recommerce (interfaces only)

- **Status:** Accepted (design-only)
- **Date:** 2026-09-13
- **Deciders:** Solution Architect, Backend Lead, Ops, Compliance (Phase 3.2)

## Context

PRD §52/§54 contemplate eventual export of Nigerian recommerce inventory (diaspora buyers, regional West Africa). Shipping, duties, FX, and regulated payments must not be bolted onto Lagos checkout without explicit adapters. Phase 3.2 ships **interfaces and a compliance checklist only** — no purchase UI, no live export checkout, no duty calculator in production paths.

## Decision

1. **No UI / purchase flows in `v2.1`** — Web, mobile, and admin must not expose “Ship outside Nigeria” checkout, cart FX, or customs forms. Any future work requires a dedicated phase tag.
2. **Export flow interfaces** (Nest provider tokens; mock + no-op prod stubs):
   - `ExportEligibilityProvider` — given listing + destination ISO country, return `{ eligible, reasons[] }` (category bans, HS hints, seller KYC tier).
   - `InternationalShippingProvider` — quote `{ feeKoboOrFx, carrier, etaDays }` for origin Lagos/Abuja/PH → destination; never mutate Order in `v2.1`.
   - `DutiesAndTaxProvider` — estimate duties/VAT; returns advisory only; does not charge.
   - `CrossBorderComplianceGate` — checklist gate before any future order intent with `destinationCountry != NG`.
3. **Payments** — Cross-border settlement stays out of ADR-002 escrow until a regulated partner and NDPR/CBN review land. Mock PSP must refuse non-NG destinations.
4. **Compliance checklist (ops)** — Before enabling any destination:
   - [ ] Restricted categories / dual-use screen
   - [ ] Seller identity tier ≥ Identity verified
   - [ ] HS code mapping for top 20 SKUs
   - [ ] Carrier SLA + prohibited items list
   - [ ] Duty/VAT disclosure copy approved by Legal
   - [ ] Chargeback / dispute path for international parcels
   - [ ] NDPR + destination privacy notice
   - [ ] FX display policy (NGN vs destination currency)

## Consequences

- Engineers may add empty adapter modules under `providers/cross-border/` later without changing checkout.
- Product must not market “ship abroad” until a follow-on ADR amends this decision.
- City expansion (ADR-008) is domestic-only and does not imply export readiness.

## References

- PRD §52 · `CURSOR-PROMPT-PHASE2-3.md` Prompt 3.2 · ADR-002 payments
