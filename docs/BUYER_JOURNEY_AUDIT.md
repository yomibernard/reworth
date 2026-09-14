# Buyer journey audit — Phase 3.3 (PRD §35)

Anti-friction: monetization must never paywall browsing, listing creation, messaging, offers, or buying.

| Surface | Free? | Monetization touch | Notes |
| --- | --- | --- | --- |
| Browse / home / search | Yes | None on buyer path | Boosted/Featured chips are seller-paid signals only |
| Listing detail (buyer) | Yes | None | Pay only if buyer opts into inspection/auth product fees (verticals) |
| Create listing | Yes | None | Failure of Plus/boost never blocks publish |
| Messaging / chat | Yes | None | |
| Offers | Yes | None | |
| Buy / checkout | Yes | Protection + delivery already in order math; not a seller boost paywall | |
| Seller Boost / Featured | Seller opt-in | Explicit purchase from listing / my listings | ≤1 min on mobile |
| Seller Plus | Seller opt-in | Explicit upgrade | Starter remains free |
| Promoted search | Admin-assigned | ADR-009 — not buyer paywall | |

**Checklist (acceptance #5):** verified in code — no middleware/guards require payment for browse, list, message, offer, or buy. Monetization routes live under `/monetization/*` and `/me/seller-plan*` and are seller-initiated.
