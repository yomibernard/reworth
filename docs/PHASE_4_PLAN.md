# Phase 4 plan — Chat + Offers

**Branch:** `phase-4-chat-offers` · **Tag:** `v0.4-chat-offers`  
**Depends on:** Phase 3 (`v0.3-discovery`)

## Schema
- Conversation (listingId + buyerId + sellerId unique), Message, Offer, OfferEvent
- UserBlock, UserMute, ChatScanRule, OrderIntent (stub for Phase 5)
- MessageType: TEXT | IMAGE | LISTING_CARD | OFFER_CARD | SYSTEM

## Chat
- REST CRUD + Socket.io gateway (JWT); polling GET messages?after=
- PII strip on all payloads; ChatScanService → RiskEvent + warning flags
- Block / report / mute

## Offers
- One active offer per buyer/listing; accept/reject/counter/withdraw
- Accept → OrderIntent + listing RESERVED (1h hold)
- 24h expiry cron

## UI
- Web `/chats`, `/chats/[id]`; wire PDP CHAT / MAKE OFFER
- Mobile Chats tab

## Risks
- Socket.io needs `@nestjs/websockets` + `@nestjs/platform-socket.io`
- FCM deferred to Phase 6 (in-app notify stub only)
