# Phase 2.4 plan — Verticals & Commercial (`v1.3-verticals`)

**Roles:** Architect · Backend · Frontend · Admin · QA · Finance  
**PRD:** §27, §34, §5 Persona E, §51

## Decisions
1. Add `OrderStatus.IN_AUTHENTICATION` between FUNDED and HANDED_OVER for luxury-required orders.
2. InspectionProvider + AuthenticationProvider with mock adapters + webhook endpoints.
3. ProAccount separate from consumer Profile; storefront via `Profile.handle` → `/@[handle]`.
4. Referral reward = free listing boost (Promotion credit); anti-abuse via device fingerprint hash + payment account + velocity.
5. Fees configurable via env: `INSPECTION_FEE_KOBO`, `AUTH_FEE_KOBO`, `PRO_SUBSCRIPTION_KOBO`.

## Deliverables
Schema · verticals module · pro · referrals · admin queues · web badges/storefront · tests · tag
