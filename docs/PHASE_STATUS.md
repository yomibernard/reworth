# Phase status

| Field | Value |
| --- | --- |
| Current phase | **4 — Chat + Offers** |
| Prompt | Prompt 5 |
| Target tag | `v0.4-chat-offers` |
| Branch | `phase-4-chat-offers` |
| Status | **Complete (pending PR merge)** |
| Last updated | 2026-09-12 |

## What exists (Phase 4)

### API
- Conversation, Message, Offer, OfferEvent, OrderIntent, UserBlock, UserMute, ChatScanRule
- REST chat + Socket.io `/chat` gateway; polling `?after=`
- PII redaction; scam scan → `scamWarning` + RiskEvent
- Offers lifecycle; accept → listing RESERVED + OrderIntent (Phase 5 converts)
- **63 unit tests** green

### Clients
- Web `/chats`, `/chats/[id]`; PDP Chat + Make offer
- Mobile Chats tab + listing chat/offer

### Docs
- [`docs/PHASE_4_PLAN.md`](PHASE_4_PLAN.md)

## Local

```bash
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm dev
# Chats http://localhost:3000/chats
```

## Known gaps
- Full FCM push → Phase 6
- Order checkout from OrderIntent → Phase 5
- Admin edit of ChatScanRule → Phase 8

## Resume point
**Phase 4 complete.** Next: **Phase 5 — Orders, Payments & Disputes** (`v0.5-orders-payments`).

```
Continue: resume Phase 5 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan. Do not restart completed work.
```
