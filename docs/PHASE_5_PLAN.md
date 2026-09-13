# Phase 5 plan — Orders, Protected Payments & Disputes

**Branch:** `phase-5-orders-payments` · **Tag:** `v0.5-orders-payments`  
**Depends on:** Phase 4 (`v0.4-chat-offers`) — converts OrderIntent → Order

## Schema
Order, OrderEvent, Payment, Payout, Refund, Dispute, DisputeEvidence  
IdempotencyKey store for money ops

## Orders SM
created → payment_pending → funded → handed_over → received → completed  
+ cancelled, dispute_hold, refund_requested → refund_issued

## Payments
Expand PspProvider: initiate, webhook, release, refund; MockPsp + Paystack stub  
Buyer protection fee 2.5% cap ₦5,000; auto-release 3 days

## Disputes
PRD §18 reasons; evidence; seller 72h; admin resolution

## ADR-002
Mark Implemented with mock modeling licensed-PSP hold

## UI
Checkout, order timeline, dispute pages web+mobile; wire BUY NOW + accepted offer
