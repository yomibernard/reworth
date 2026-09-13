# ADR-003 — Swap / give-away fulfilment failure & cash reversal

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Solution Architect, Payments Engineer, Ops

## Context

Swap and swap+cash orders move **two item legs**. Cash-top-up (if any) uses the existing escrow pipeline (ADR-002). Pure swaps and give-aways have no payment calls. A failed or returned leg must not strand escrow or leave listings reserved forever.

## Decision

1. **Order shape:** `transactionType` ∈ `CASH | SWAP | SWAP_CASH | GIVEAWAY`. Swap orders store `swapListingAId` (target) and `swapListingBId` (offered). Each leg has `legAStatus` / `legBStatus`: `PENDING | HANDED_OVER | RECEIVED | FAILED | RETURNED`.
2. **Completion:** Order reaches `COMPLETED` only when both required legs are `RECEIVED` (give-away: single inbound leg to claimant). Then listings → `SOLD`, cash escrow (if any) releases to the cash recipient.
3. **One leg fails / returned:**
   - Set failed leg → `FAILED` or `RETURNED`; order → `DISPUTED` (or stay open with `SUPPORT_HOLD` flag in `OrderEvent`).
   - Open a SupportTicket automatically (`kind=SWAP_LEG_FAILURE`) linking both parties.
   - If cash was captured in escrow: **do not auto-release**. Prefer **full refund to payer** after Ops confirms both items returned / not delivered (admin dispute resolution reuse). Documented Ops path in `docs/RUNBOOK.md` §swap.
   - Listings: failed target returns to `LIVE` if not damaged; otherwise `REMOVED` pending admin.
4. **Idempotency:** Confirm-receipt and hand-over remain idempotent per leg (same as Phase 5 confirm).
5. **Pure swap:** Zero calls into Payments module (enforced in service + tested).

## Consequences

- Admin dispute tools cover swap cash reversal.
- Trust: completed swaps recompute both users; no-show on give-away claim lowers trust via `giveaway_noshow` reason.
