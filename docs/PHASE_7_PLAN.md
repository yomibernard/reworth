# Phase 7 plan — Trust: Reviews + Trust Score

**Branch:** `phase-7-trust` · **Tag:** `v0.7-trust`  
**Depends on:** Phase 6 (`v0.6-logistics-notifications`)

## Reviews
- Post only on COMPLETED orders; one per side; mutual publish
- Sub-ratings + optional text/photos; single reply ≤200
- Moderation keyword scan stub; report → queue

## Trust score
- Weighted 0–100; recompute on complete + daily cron
- Public tiers only: Top Seller / Trusted (never low raw score)

## Profile
- GET /users/:id public DTO; seller card on PDP upgraded
- Response-time from chat first replies (30d median)

## Admin
- GET /admin/users/:id/trust-score preview (RBAC)
