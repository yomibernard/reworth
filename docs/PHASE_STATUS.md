# Phase status

| Field | Value |
| --- | --- |
| Current phase | **5 — Orders, Protected Payments & Disputes** |
| Prompt | Prompt 6 |
| Target tag | `v0.5-orders-payments` |
| Branch | `phase-5-orders-payments` |
| Status | **Complete (pending PR merge)** |
| Last updated | 2026-09-13 |

## What exists (Phase 5)

### API
- Order, Payment, Payout, Refund, Dispute, DisputeEvidence, IdempotencyRecord
- Escrow SM via MockPsp (+ Paystack adapter stub); webhook replay-safe
- Buyer protection fee 2.5% cap ₦5,000; auto-release; coverage window
- Admin dispute resolution; **76 unit tests** green
- ADR-002 marked Implemented

### Clients
- Web `/checkout`, `/orders/[id]`, `/disputes/[id]`; BUY NOW / accept-offer wired
- Mobile orders helpers

### Docs
- [`docs/PHASE_5_PLAN.md`](PHASE_5_PLAN.md)

## Local

```bash
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm dev
# Checkout → mock webhook POST /api/v1/webhooks/mock-psp
```

## Resume point
**Phase 5 complete.** Next: **Phase 6 — Logistics + Notifications** (`v0.6-logistics-notifications`).

```
Continue: resume Phase 6 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan.
```
