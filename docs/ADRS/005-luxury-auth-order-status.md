# ADR-005: Luxury authentication order status

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Solution Architect, Backend Lead, Finance (Phase 2.4)

## Context

Luxury listings can require third-party authentication (bags, watches) before the buyer takes possession. Escrow already holds funds after `FUNDED`. We need an explicit order state so ops, chat, and fulfilment UIs do not treat the order as ready for handover while auth is in flight.

## Decision

Add **`OrderStatus.IN_AUTHENTICATION`** between **`FUNDED`** and **`HANDED_OVER`**:

```
… → FUNDED → IN_AUTHENTICATION → HANDED_OVER → …
```

- Applies when the listing has `authRequired` (default for luxury category) and a `LuxuryAuthJob` is open.
- Transition into `IN_AUTHENTICATION` after successful funding (or when auth job starts, if funding already complete).
- Partner mock / webhook marks the job `PASSED` or `FAILED`:
  - **PASSED** → set listing `authenticationStatus=PASSED`, attach `certificateId`, then allow `HANDED_OVER`.
  - **FAILED** → dispute / refund path; do not advance to handover.
- Non-luxury and `authRequired=false` listings skip this status entirely (FUNDED → HANDED_OVER unchanged).

## Consequences

- Web/mobile order labels show “In authentication”.
- Checkout and escrow money integrity unchanged (ADR-002); this is a fulfilment gate only.
- Fees (`AUTH_FEE_KOBO`) are product config, not a new payment rail.

## References

- PRD §27 / §51 · `CURSOR-PROMPT-PHASE2-3.md` Prompt 2.4
- Schema: `OrderStatus.IN_AUTHENTICATION`, `Listing.authRequired`, `LuxuryAuthJob`
