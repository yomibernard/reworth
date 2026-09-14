# Phase 3.2 plan — B2B & Expansion (`v2.1-expansion`)

**Roles:** Architect · Backend · Ops · Frontend · QA  
**PRD:** §5 Persona C, §52, §54, §57

## Decisions
1. **Region config** is greenfield (no `v1.0.1-multicity` in repo). Ship `config/regions/*.json` + `RegionConfigService`; seed Lagos, Abuja, Port Harcourt; prove Ibadan via config-only.
2. **CorporateAccount** separate from ProAccount; relocation projects auto-create MovingSale + ManagedPickup hooks.
3. **PartnerApiKey** HMAC webhooks mirror Paystack pattern; partner console scoped to CommunityManager/partner org.
4. **CircularHandoff** for donate-after-N / unsellable → verified recycler/charity.
5. **Cross-border:** ADR-007 interfaces only — no purchase UI.

## Deliverables
Region config · corporate relocation · estate partner API · circular hand-offs · playbook · tests · tag
