# Phase 4 residuals (hardening)

Shipped after `v0.4-chat-offers` without moving the tag:

- Delivery receipts: `POST /conversations/:id/delivered` + auto on poll/resync
- Mute: suppresses unread badge + message notify stub; mute/unmute on mobile + web Safety sheet
- Reconnect resync test: simulated 10s drop + `clientMsgId` / `?after=` zero-duplicate coverage
