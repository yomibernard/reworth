# Phase status

| Field | Value |
| --- | --- |
| Current phase | **2 — Listings, Media & AI-Assisted Listing** |
| Prompt | Prompt 3 (`CURSOR-PROMPT.md`) |
| Target tag | `v0.2-listings` |
| Branch | `phase-2-listings` |
| Status | **Complete (pending PR merge)** |
| Last updated | 2026-09-12 |

## What exists (Phase 2)

### API
- Schema: Category, Listing, ListingImage, ListingEvent, RiskEvent, Report + migration `phase2_listings`
- Seed: 16 PRD §26 categories (+ subcategories)
- Media: presign → client upload → complete → pipeline (mock/sharp); malware mock; dHash
- Listings: CRUD, assist (rule-based mock), price intelligence v1, publish with fraud hooks, report, 7-day expiry scheduler
- Public DTO strips `addressPrivate` / address / VIN / seller PII (automated test)
- State machine 409 on invalid transitions
- **34 unit tests** green

### Clients
- Web `/sell` 60s path; `/listings/[id]` PDP (PRD §24)
- Mobile SELL wizard + listing detail modal
- Landing SELL → `/sell`

### Docs
- [`docs/PHASE_2_PLAN.md`](PHASE_2_PLAN.md)

## Local migrate

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis minio
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm dev
# Sell: http://localhost:3000/sell (after auth)
```

## Known gaps
- Real MinIO upload + Sharp variants need Docker/native libs; default `MEDIA_PIPELINE=mock`
- Lighthouse ≥80 not run in CI this phase (manual/follow-up)
- Chat/Offer/Buy Now CTAs toast “Coming soon” (Phases 4–5)
- Swap/Give Away selectable; purchase flows deferred (post-MVP 2.1)

## Exact resume point
**Phase 2 code complete.** Next: **Phase 3 — Discovery** (`v0.3-discovery`) after merge + tag `v0.2-listings`.

```
Continue: resume Phase 3 from docs/PHASE_STATUS.md. Re-read AGENTS.md and
PRD.md, verify the last commit's tests still pass, then continue the plan. Do not restart completed work.
```
