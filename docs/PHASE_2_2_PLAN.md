# Phase 2.2 plan — Moving Sales + Estate Communities (`v1.1-moving-communities`)

**Roles:** Product Owner · Solution Architect · Backend · Frontend · Mobile · DB · Ops · QA  
**PRD:** §21, §22, §51 · Prompt 2.2

## Decisions
1. Extend catalog `Community` (do not replace location-label `Listing.community` string).
2. Private listings: `NotFoundException` for non-members (search exclude + GET + no payload leak).
3. Estate manager = `CommunityManager` assignment scoped to one community; OPERATIONS/SUPER_ADMIN can manage all.
4. Moving sale deadline past → status `COMPLETED`; items stay LIVE unless seller cancels.

## Deliverables
- Schema + migration · MovingSalesModule · CommunitiesModule · home rail · admin CRUD/queue · web/mobile UI · tests · RBAC · seed PRD examples · tag
